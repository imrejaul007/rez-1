// @ts-nocheck
/**
 * useExplore — Shared state and API logic for the Explore page.
 *
 * Extracts all state management, data fetching, and derived values
 * from the monolithic explore.tsx.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import reelApi from '@/services/reelApi';
import exploreApi from '@/services/exploreApi';
import productsApi from '@/services/productsApi';
import { useRezBalance, useGetCurrencySymbol } from '@/stores';
import { useCurrentLocation } from '@/hooks/useLocation';
import { useIsMounted } from '@/hooks/useIsMounted';

// Category filter data
export const categoryFilters = [
  { id: 'all', label: 'All', emoji: '\u{1F30D}', active: true },
  { id: 'halal', label: 'Halal', emoji: '\u{262A}\u{FE0F}', active: false },
  { id: 'vegan', label: 'Vegan', emoji: '\u{1F331}', active: false },
  { id: 'veg', label: 'Veg', emoji: '\u{1F957}', active: false },
  { id: 'adult', label: 'Adult', emoji: '\u{1F51E}', active: false },
  { id: 'occasion', label: 'Occasion', emoji: '\u{1F389}', active: false },
];

// Quick discovery chips — colors match Colors.warning / Colors.info from DesignSystem
export const quickChips = [
  { id: 'trending', label: 'Trending Near You', icon: 'flame', color: '#FF9F1C' },
  { id: 'delivery', label: '60 Min Delivery', icon: 'time', color: '#1a3a52' },
];

// Map Ionicon names to emojis for category display
const iconToEmojiMap: { [key: string]: string } = {
  'restaurant-outline': '\u{1F354}', 'restaurant': '\u{1F354}',
  'fast-food-outline': '\u{1F354}', 'fast-food': '\u{1F354}',
  'cafe-outline': '\u{2615}', 'cafe': '\u{2615}',
  'pizza-outline': '\u{1F355}', 'pizza': '\u{1F355}',
  'shirt-outline': '\u{1F454}', 'shirt': '\u{1F454}',
  'bag-outline': '\u{1F45C}', 'bag': '\u{1F45C}',
  'bag-handle-outline': '\u{1F45C}', 'bag-handle': '\u{1F45C}',
  'phone-portrait-outline': '\u{1F4F1}', 'phone-portrait': '\u{1F4F1}',
  'laptop-outline': '\u{1F4BB}', 'laptop': '\u{1F4BB}',
  'calculator-outline': '\u{1F4F1}', 'calculator': '\u{1F4F1}',
  'tv-outline': '\u{1F4FA}', 'tv': '\u{1F4FA}',
  'color-palette-outline': '\u{1F484}', 'color-palette': '\u{1F484}',
  'sparkles-outline': '\u{1F484}', 'sparkles': '\u{1F484}',
  'flower-outline': '\u{1F490}', 'flower': '\u{1F490}',
  'cart-outline': '\u{1F6D2}', 'cart': '\u{1F6D2}',
  'basket-outline': '\u{1F9FA}', 'basket': '\u{1F9FA}',
  'barbell-outline': '\u{1F3CB}\u{FE0F}', 'barbell': '\u{1F3CB}\u{FE0F}',
  'fitness-outline': '\u{1F3CB}\u{FE0F}', 'fitness': '\u{1F3CB}\u{FE0F}',
  'bicycle-outline': '\u{1F6B4}', 'bicycle': '\u{1F6B4}',
  'trophy-outline': '\u{1F3C6}', 'trophy': '\u{1F3C6}',
  'home-outline': '\u{1F3E0}', 'home': '\u{1F3E0}',
  'construct-outline': '\u{1F527}', 'construct': '\u{1F527}',
  'hammer-outline': '\u{1F528}', 'hammer': '\u{1F528}',
  'build-outline': '\u{1F6E0}\u{FE0F}', 'build': '\u{1F6E0}\u{FE0F}',
  'snow-outline': '\u{2744}\u{FE0F}', 'snow': '\u{2744}\u{FE0F}',
  'sunny-outline': '\u{2600}\u{FE0F}', 'sunny': '\u{2600}\u{FE0F}',
  'receipt-outline': '\u{1F9FE}', 'receipt': '\u{1F9FE}',
  'card-outline': '\u{1F4B3}', 'card': '\u{1F4B3}',
  'cash-outline': '\u{1F4B5}', 'cash': '\u{1F4B5}',
  'book-outline': '\u{1F4DA}', 'book': '\u{1F4DA}',
  'school-outline': '\u{1F393}', 'school': '\u{1F393}',
  'medical-outline': '\u{1F3E5}', 'medical': '\u{1F3E5}',
  'medkit-outline': '\u{1F48A}', 'medkit': '\u{1F48A}',
  'heart-outline': '\u{2764}\u{FE0F}', 'heart': '\u{2764}\u{FE0F}',
  'film-outline': '\u{1F3AC}', 'film': '\u{1F3AC}',
  'musical-notes-outline': '\u{1F3B5}', 'musical-notes': '\u{1F3B5}',
  'game-controller-outline': '\u{1F3AE}', 'game-controller': '\u{1F3AE}',
  'airplane-outline': '\u{2708}\u{FE0F}', 'airplane': '\u{2708}\u{FE0F}',
  'car-outline': '\u{1F697}', 'car': '\u{1F697}',
  'bus-outline': '\u{1F68C}', 'bus': '\u{1F68C}',
  'train-outline': '\u{1F686}', 'train': '\u{1F686}',
  'paw-outline': '\u{1F43E}', 'paw': '\u{1F43E}',
};

// Get emoji from icon name or category name
export const getEmojiForCategory = (icon?: string, name?: string): string => {
  if (icon && iconToEmojiMap[icon]) return iconToEmojiMap[icon];
  const lowerName = (name || '').toLowerCase();
  if (lowerName.includes('food') || lowerName.includes('dining') || lowerName.includes('restaurant')) return '\u{1F354}';
  if (lowerName.includes('fashion') || lowerName.includes('cloth')) return '\u{1F45C}';
  if (lowerName.includes('electronic') || lowerName.includes('mobile') || lowerName.includes('phone')) return '\u{1F4F1}';
  if (lowerName.includes('beauty') || lowerName.includes('salon') || lowerName.includes('spa')) return '\u{1F484}';
  if (lowerName.includes('grocery') || lowerName.includes('supermarket')) return '\u{1F6D2}';
  if (lowerName.includes('fitness') || lowerName.includes('gym') || lowerName.includes('sport')) return '\u{1F3CB}\u{FE0F}';
  if (lowerName.includes('home') || lowerName.includes('delivery')) return '\u{1F3E0}';
  if (lowerName.includes('service') || lowerName.includes('repair')) return '\u{1F527}';
  if (lowerName.includes('ac') || lowerName.includes('cooling')) return '\u{2744}\u{FE0F}';
  if (lowerName.includes('bill') || lowerName.includes('payment')) return '\u{1F9FE}';
  if (lowerName.includes('coach') || lowerName.includes('education') || lowerName.includes('tutor')) return '\u{1F4DA}';
  if (lowerName.includes('health') || lowerName.includes('medical') || lowerName.includes('pharmacy')) return '\u{1F48A}';
  if (lowerName.includes('travel') || lowerName.includes('hotel')) return '\u{2708}\u{FE0F}';
  if (lowerName.includes('pet')) return '\u{1F43E}';
  if (lowerName.includes('entertainment') || lowerName.includes('movie')) return '\u{1F3AC}';
  return '\u{1F3F7}\u{FE0F}';
};

// Fallback search suggestions (used if API fails)
const getDefaultSearchSuggestions = (currencySymbol: string) => [
  `Halal biryani under ${currencySymbol}500`,
  `Best sneakers under ${currencySymbol}2,000`,
  'Hair spa with cashback',
  'Coffee shops nearby',
];

export interface UseExploreReturn {
  // Data
  ugcReels: any[];
  categories: any[];
  trendingStores: any[];
  searchSuggestions: string[];
  isLoading: boolean;
  refreshing: boolean;
  currencySymbol: string;
  rezCoins: number;

  // Location
  currentLocation: any;
  isLocationLoading: boolean;
  locationDisplay: string;
  locationSubtitle: string;

  // State
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedChip: string;
  setSelectedChip: (chip: string) => void;
  currentPlaceholder: number;

  // Handlers
  navigateTo: (path: string) => void;
  handleRefresh: () => Promise<void>;
}

export function useExplore(): UseExploreReturn {
  const isMounted = useIsMounted();
  const router = useRouter();
  const rezBalance = useRezBalance();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { currentLocation, isLoading: isLocationLoading } = useCurrentLocation();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedChip, setSelectedChip] = useState('trending');
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);

  // API data state
  const [ugcReels, setUgcReels] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [trendingStores, setTrendingStores] = useState<any[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>(() => getDefaultSearchSuggestions(currencySymbol));
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Format location display
  const locationDisplay = useMemo(
    () =>
      currentLocation?.address?.city ||
      currentLocation?.address?.formattedAddress?.split(',')[0] ||
      'Select Location',
    [currentLocation?.address?.city, currentLocation?.address?.formattedAddress]
  );
  const locationSubtitle = useMemo(
    () => (currentLocation ? 'Within 3 km' : 'Tap to set location'),
    [currentLocation]
  );

  const rezCoins = rezBalance;

  // Shared fetch guard
  const isFetchingRef = useRef(false);

  const fetchAllExploreData = useCallback(async (cancelled: { current: boolean }) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [reelsRes, categoriesRes, storesRes, popularSearchesRes] = await Promise.allSettled([
        reelApi.getTrendingReels({ limit: 6 }),
        exploreApi.getCategories(),
        exploreApi.getTrendingStores({ limit: 5 }),
        productsApi.getPopularSearches(4),
      ]);

      if (cancelled.current) return;

      if (popularSearchesRes.status === 'fulfilled') {
        const psRes = popularSearchesRes.value;
        if (psRes.success && psRes.data && psRes.data.length > 0) {
          setSearchSuggestions(psRes.data);
        }
      }

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
    return () => {
      cancelled.current = true;
    };
  }, [fetchAllExploreData]);

  // Reset selected category on focus
  useFocusEffect(
    useCallback(() => {
      setSelectedCategory('all');
    }, [])
  );

  // Rotate placeholder
  useFocusEffect(
    useCallback(() => {
      if (searchSuggestions.length === 0) return;
      const interval = setInterval(() => {
        setCurrentPlaceholder((prev) => (prev + 1) % searchSuggestions.length);
      }, 3000);
      return () => clearInterval(interval);
    }, [searchSuggestions.length])
  );

  const navigateTo = useCallback(
    (path: string) => {
      router.push(path as any);
    },
    [router]
  );

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

  return {
    ugcReels,
    categories,
    trendingStores,
    searchSuggestions,
    isLoading,
    refreshing,
    currencySymbol,
    rezCoins,
    currentLocation,
    isLocationLoading,
    locationDisplay,
    locationSubtitle,
    selectedCategory,
    setSelectedCategory,
    selectedChip,
    setSelectedChip,
    currentPlaceholder,
    navigateTo,
    handleRefresh,
  };
}
