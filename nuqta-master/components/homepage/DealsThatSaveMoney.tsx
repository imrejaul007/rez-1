// @ts-nocheck
/**
 * DealsThatSaveMoney Component
 * 
 * A section with tabs (Offers, Cashback, Exclusive) that displays different
 * deal categories based on the selected tab. Modern design with glassy effects.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import realOffersApi, { Offer } from '@/services/realOffersApi';
import apiClient from '@/services/apiClient';
import { useAuthUser, useCurrentRegionId, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import OfferTile from '@/components/offers/OfferTile';
import { calculateSaveAmount } from '@/utils/savingsCalculator';
import { useIsMounted } from '@/hooks/useIsMounted';

// Nuqta Brand Colors
const COLORS = {
  primary: colors.lightMustard,
  primaryDark: colors.brand.goldRich,
  white: colors.background.primary,
  black: '#000000',
  textDark: colors.nileBlue,
  textMuted: colors.neutral[500],
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  tabActive: colors.lightMustard,
  tabInactive: colors.neutral[200],
  tabBg: colors.neutral[100],
  background: colors.linen, // Linen background
  backgroundLight: colors.linen, // Linen light
};

// Category card data structure
interface CategoryCard {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  badge?: string;
  count: number;
}

// Exclusive zone data structure (from API)
interface ExclusiveZoneCard {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradientColors: readonly [string, string, string];
  offersCount: number;
  verificationRequired: boolean;
  eligibilityType: string;
  userEligible?: boolean; // From API - indicates if current user is eligible
}

// Cashback campaign data structure (from API)
interface CashbackCard {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradientColors: readonly [string, string, string];
  multiplier?: number;
  type: 'double_cashback' | 'coin_drop' | 'campaign';
}

// Map backend icon names to Ionicons
const mapIconToIonicon = (icon: string): keyof typeof Ionicons.glyphMap => {
  // If icon already has -outline suffix, return as is (if valid)
  if (icon && icon.endsWith('-outline')) {
    return icon as keyof typeof Ionicons.glyphMap;
  }

  const mapping: Record<string, keyof typeof Ionicons.glyphMap> = {
    // Exclusive zones
    'school': 'school-outline',
    'briefcase': 'briefcase-outline',
    'woman': 'woman-outline',
    'gift': 'gift-outline',
    'heart': 'heart-outline',
    'star': 'star-outline',
    'shield': 'shield-outline',
    'medkit': 'medkit-outline',
    'accessibility': 'accessibility-outline',
    'book': 'book-outline',
    'business': 'business-outline',
    // Cashback campaigns
    'flash': 'flash-outline',
    'cart': 'cart-outline',
    'cafe': 'cafe-outline',
    'shirt': 'shirt-outline',
    'cash': 'cash-outline',
    'wallet': 'wallet-outline',
    'trophy': 'trophy-outline',
    // Additional icons that might come from backend
    'target': 'locate-outline',
    'location': 'location-outline',
    'time': 'time-outline',
    'pricetag': 'pricetag-outline',
    'people': 'people-outline',
    'person': 'person-outline',
    'ribbon': 'ribbon-outline',
    'medal': 'medal-outline',
    'diamond': 'diamond-outline',
    'flame': 'flame-outline',
    'chatbubble': 'chatbubble-outline',
    'create': 'create-outline',
    'sparkles': 'sparkles-outline',
    'rocket': 'rocket-outline',
    'bag': 'bag-outline',
    'storefront': 'storefront-outline',
    'receipt': 'receipt-outline',
    'card': 'card-outline',
    'phone': 'phone-portrait-outline',
  };
  return mapping[icon] || 'apps-outline';
};

// Extended user type for verification-related properties not in unified User type
interface ExtendedUser {
  verifications?: {
    student?: boolean;
    corporate?: boolean;
    defence?: boolean;
    healthcare?: boolean;
    teachers?: boolean;
    government?: boolean;
    'differently-abled'?: boolean;
  };
  isFirstOrder?: boolean;
}

// Generate gradient colors from background and icon color
const generateGradientColors = (bgColor: string, iconColor: string): readonly [string, string, string] => {
  // Use predefined gradients based on icon color
  const gradientMap: Record<string, readonly [string, string, string]> = {
    [colors.brand.indigo]: ['#A5B4FC', '#818CF8', colors.brand.indigo], // Indigo - Student
    '#0EA5E9': ['#7DD3FC', '#38BDF8', '#0EA5E9'], // Sky - Corporate
    [colors.lightPeach]: ['#F9A8D4', '#F472B6', colors.lightPeach], // Pink - Women
    [colors.warningScale[400]]: ['#FCD34D', colors.warningScale[400], colors.warningScale[400]], // Amber - Birthday
    [colors.lightMustard]: ['#ffe5a3', '#ffd97a', colors.lightMustard], // Mustard gradient - Senior
    [colors.nileBlue]: ['#C4B5FD', colors.brand.purpleSoft, colors.nileBlue], // Violet - First time
    '#243f55': ['#2d5c7e', colors.brand.nileBlueLight, colors.nileBlue], // Nile Blue gradient - Defence
    [colors.error]: ['#FCA5A5', colors.errorScale[400], colors.error], // Red - Healthcare
    '#2d4a5f': ['#93C5FD', colors.infoScale[400], '#2d4a5f'], // Blue - Teachers
    [colors.cyanDark]: ['#67E8F9', '#22D3EE', colors.cyanDark], // Cyan - Government
    [colors.brand.sand]: ['#FDBA74', '#FB923C', colors.brand.sand], // Orange - Disabled
  };
  return gradientMap[iconColor] || [colors.neutral[200], colors.neutral[300], colors.neutral[400]];
};

// Fallback static exclusive categories (used when API fails)
const FALLBACK_EXCLUSIVE_CATEGORIES: ExclusiveZoneCard[] = [
  {
    id: 'student',
    slug: 'student',
    title: 'Students',
    subtitle: 'Campus Zone',
    icon: 'school-outline',
    gradientColors: [colors.infoScale[400], colors.nileBlue, '#2d4a5f'] as const,
    offersCount: 0,
    verificationRequired: true,
    eligibilityType: 'student',
    userEligible: false,
  },
  {
    id: 'corporate',
    slug: 'corporate',
    title: 'Corporate',
    subtitle: 'Corporate Zone',
    icon: 'briefcase-outline',
    gradientColors: [colors.brand.purpleSoft, colors.nileBlue, '#243f55'] as const,
    offersCount: 0,
    verificationRequired: true,
    eligibilityType: 'corporate_email',
    userEligible: false,
  },
  {
    id: 'women',
    slug: 'women',
    title: 'Women Exclusive',
    subtitle: 'Special Rewards',
    icon: 'heart-outline',
    gradientColors: ['#F472B6', colors.lightPeach, colors.brand.sand] as const,
    offersCount: 0,
    verificationRequired: false,
    eligibilityType: 'gender',
    userEligible: false,
  },
  {
    id: 'birthday',
    slug: 'birthday',
    title: 'Birthday Specials',
    subtitle: 'Celebrate & Save',
    icon: 'gift-outline',
    gradientColors: ['#FB923C', colors.lightMustard, colors.brand.sand] as const,
    offersCount: 0,
    verificationRequired: false,
    eligibilityType: 'birthday_month',
    userEligible: false,
  },
];

// Fallback cashback categories (used when API fails)
const FALLBACK_CASHBACK_CATEGORIES: CashbackCard[] = [
  {
    id: 'double-cashback',
    title: 'Double Cashback',
    subtitle: 'Earn 2X coins',
    icon: 'cash-outline',
    gradientColors: [colors.warningScale[200], '#FCD34D', colors.warningScale[400]] as const,
    multiplier: 2,
    type: 'double_cashback',
  },
  {
    id: 'coin-drops',
    title: 'Coin Drops',
    subtitle: 'Boosted rewards',
    icon: 'flash-outline',
    gradientColors: ['#ffe5a3', '#ffd97a', colors.lightMustard] as const,
    type: 'coin_drop',
  },
];

type TabType = 'offers' | 'cashback' | 'exclusive';

interface DealsThatSaveMoneyProps {
  style?: any;
}

const DealsThatSaveMoney: React.FC<DealsThatSaveMoneyProps> = ({ style }) => {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const currentRegion = useCurrentRegionId();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [activeTab, setActiveTab] = useState<TabType>('offers');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [offerCategories, setOfferCategories] = useState<CategoryCard[]>([]);
  const isMounted = useIsMounted();

  // New state for dynamic data
  const [exclusiveZones, setExclusiveZones] = useState<ExclusiveZoneCard[]>(FALLBACK_EXCLUSIVE_CATEGORIES);
  const [cashbackData, setCashbackData] = useState<CashbackCard[]>(FALLBACK_CASHBACK_CATEGORIES);
  const [exclusiveLoading, setExclusiveLoading] = useState(false);
  const [cashbackLoading, setCashbackLoading] = useState(false);

  // New state for admin-managed section data
  const [sectionConfig, setSectionConfig] = useState<{
    title: string;
    subtitle: string;
    icon: string;
  } | null>(null);
  const [enabledTabs, setEnabledTabs] = useState<{ key: string; displayName: string; sortOrder: number }[]>([]);
  const [offersTabItems, setOffersTabItems] = useState<any[]>([]);
  const [cashbackTabItems, setCashbackTabItems] = useState<any[]>([]);
  const [exclusiveTabItems, setExclusiveTabItems] = useState<any[]>([]);
  const [sectionLoading, setSectionLoading] = useState(true);

  // Error and refresh states
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Track if impressions were already sent for current tab items
  const [impressionsSent, setImpressionsSent] = useState<Set<string>>(new Set());

  // Use ref to avoid stale closure and prevent infinite loops
  const currentRegionRef = useRef(currentRegion);
  currentRegionRef.current = currentRegion;

  // Fetch admin-managed section data - stable callback without region dependency
  const fetchSectionData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setSectionLoading(true);
      }
      setSectionError(null);

      // Use ref to get current region value without causing callback recreation
      const regionId = currentRegionRef.current;
      const response = await realOffersApi.getHomepageDealsSection(regionId);

      if (response.success && response.data) {
        const { section, enabledTabs: apiEnabledTabs, tabs } = response.data;

        // Update section config using functional update
        if (section) {
          if (!isMounted()) return;
          setSectionConfig(section);
        }

        // Update enabled tabs (sorted by sortOrder) using functional update
        if (apiEnabledTabs && apiEnabledTabs.length > 0) {
          const sortedTabs = [...apiEnabledTabs].sort((a, b) => a.sortOrder - b.sortOrder);
          setEnabledTabs(sortedTabs);
        }

        // Update tab items using functional updates
        if (tabs?.offers?.items) {
          setOffersTabItems(tabs.offers.items);
        }
        if (tabs?.cashback?.items) {
          setCashbackTabItems(tabs.cashback.items);
        }
        if (tabs?.exclusive?.items) {
          setExclusiveTabItems(tabs.exclusive.items);
        }

        // Reset impressions tracking on refresh using functional update
        if (isRefresh) {
          setImpressionsSent(new Set());
        }
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setSectionError(error.message || 'Failed to load deals');
    } finally {
      if (!isMounted()) return;
      setSectionLoading(false);
      setRefreshing(false);
    }
  }, []); // No dependencies - uses ref internally

  // Fetch section data on mount and only when region actually changes
  useEffect(() => {
    fetchSectionData();
  }, [currentRegion, fetchSectionData]);

  // Set active tab from enabled tabs when they load
  useEffect(() => {
    if (enabledTabs.length > 0) {
      const enabledKeys = enabledTabs.map(t => t.key);
      if (!enabledKeys.includes(activeTab)) {
        setActiveTab(enabledTabs[0].key as TabType);
      }
    }
  }, [enabledTabs]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSectionData(true);
  }, [fetchSectionData]);

  // Retry handler for error state
  const handleRetry = useCallback(() => {
    setSectionError(null);
    fetchSectionData();
  }, [fetchSectionData]);

  // Track impressions when items become visible (with deduplication)
  const trackImpressions = useCallback(async (items: any[], tabType: TabType) => {
    if (items.length === 0) return;

    // Filter out items that already had impressions tracked
    const newItems = items.filter(item => item._id && !impressionsSent.has(item._id));
    if (newItems.length === 0) return;

    const itemIds = newItems.map(item => item._id);

    // Mark these items as tracked
    setImpressionsSent(prev => {
      const updated = new Set(prev);
      itemIds.forEach(id => updated.add(id));
      return updated;
    });

    try {
      await apiClient.post('/offers/homepage-deals-section/track-impression', { itemIds, tabType });
    } catch (error) {
      // Silent fail for analytics - don't revert impressionsSent
    }
  }, [impressionsSent]);

  // Track click on item
  const trackClick = useCallback(async (itemId: string, tabType: TabType) => {
    if (!itemId) return;

    try {
      await apiClient.post('/offers/homepage-deals-section/track-click', { itemId, tabType });
    } catch (error) {
      // Silent fail for analytics
    }
  }, []);

  // Track impressions when tab items load (only once per item)
  useEffect(() => {
    if (sectionLoading) return; // Don't track while loading

    if (activeTab === 'offers' && offersTabItems.length > 0) {
      trackImpressions(offersTabItems, 'offers');
    } else if (activeTab === 'cashback' && cashbackTabItems.length > 0) {
      trackImpressions(cashbackTabItems, 'cashback');
    } else if (activeTab === 'exclusive' && exclusiveTabItems.length > 0) {
      trackImpressions(exclusiveTabItems, 'exclusive');
    }
  }, [activeTab, offersTabItems, cashbackTabItems, exclusiveTabItems, sectionLoading, trackImpressions]);

  // Skeleton animation with cleanup
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
    return () => { shimmerAnim.value = 0; };
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmerAnim.value * 0.4,
  }));

  // Check user verification status for exclusive zones
  const checkUserVerification = useCallback((eligibilityType: string): boolean => {
    if (!user) return false;

    // Cast to ExtendedUser for verification-related properties not in unified User type
    const extendedUser = user as unknown as ExtendedUser;

    switch (eligibilityType) {
      case 'student':
        return extendedUser?.verifications?.student === true;
      case 'corporate_email':
        return extendedUser?.verifications?.corporate === true;
      case 'gender':
        return user?.profile?.gender === 'female';
      case 'birthday_month':
        if (!user?.profile?.dateOfBirth) return false;
        const birthMonth = new Date(user.profile.dateOfBirth).getMonth();
        const currentMonth = new Date().getMonth();
        return birthMonth === currentMonth;
      case 'age':
        if (!user?.profile?.dateOfBirth) return false;
        const age = Math.floor((Date.now() - new Date(user.profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 60;
      case 'verification':
        return extendedUser?.isFirstOrder !== false;
      default:
        return false;
    }
  }, [user]);

  // Fetch exclusive zones from backend
  const fetchExclusiveZones = useCallback(async () => {
    setExclusiveLoading(true);
    try {
      const [zonesResponse, profilesResponse] = await Promise.all([
        realOffersApi.getExclusiveZones(),
        realOffersApi.getSpecialProfiles(),
      ]);

      const zones: ExclusiveZoneCard[] = [];

      // Map exclusive zones
      if (zonesResponse.success && zonesResponse.data) {
        zonesResponse.data.forEach((zone: any) => {
          zones.push({
            id: zone._id || zone.slug,
            slug: zone.slug,
            title: zone.name,
            subtitle: zone.shortDescription || `${zone.offersCount || 0} offers`,
            icon: mapIconToIonicon(zone.icon),
            gradientColors: generateGradientColors(zone.backgroundColor, zone.iconColor),
            offersCount: zone.offersCount || 0,
            verificationRequired: zone.verificationRequired || false,
            eligibilityType: zone.eligibilityType || 'none',
            userEligible: zone.userEligible, // From API response
          });
        });
      }

      // Map special profiles (skip duplicates by slug)
      if (profilesResponse.success && profilesResponse.data) {
        const existingSlugs = new Set(zones.map(z => z.slug));
        profilesResponse.data.forEach((profile: any) => {
          // Skip if slug already exists (avoid duplicates like 'senior')
          if (existingSlugs.has(profile.slug)) {
            return;
          }
          zones.push({
            id: profile._id || profile.slug,
            slug: profile.slug,
            title: profile.name,
            subtitle: profile.discountRange || `${profile.offersCount || 0} offers`,
            icon: mapIconToIonicon(profile.icon),
            gradientColors: generateGradientColors(profile.backgroundColor, profile.iconColor),
            offersCount: profile.offersCount || 0,
            verificationRequired: !!profile.verificationRequired,
            eligibilityType: profile.slug,
            userEligible: profile.userEligible, // From API response
          });
        });
      }

      if (zones.length > 0) {
        if (!isMounted()) return;
        setExclusiveZones(zones);
      }
    } catch (error) {
      // Keep fallback data
    } finally {
      if (!isMounted()) return;
      setExclusiveLoading(false);
    }
  }, []);

  // Fetch cashback campaigns from backend
  const fetchCashbackData = useCallback(async () => {
    setCashbackLoading(true);
    try {
      const [doubleCBResponse, coinDropsResponse] = await Promise.all([
        realOffersApi.getDoubleCashbackCampaigns(10),
        realOffersApi.getCoinDrops({ limit: 10 }),
      ]);

      const cards: CashbackCard[] = [];

      // Map double cashback campaigns
      if (doubleCBResponse.success && doubleCBResponse.data) {
        doubleCBResponse.data.forEach((campaign: any) => {
          cards.push({
            id: campaign._id || campaign.title,
            title: campaign.title,
            subtitle: campaign.subtitle || `${campaign.multiplier}X cashback`,
            icon: mapIconToIonicon(campaign.icon || 'flash'),
            gradientColors: [colors.warningScale[200], '#FCD34D', colors.warningScale[400]] as const,
            multiplier: campaign.multiplier,
            type: 'double_cashback',
          });
        });
      }

      // Map coin drops
      if (coinDropsResponse.success && coinDropsResponse.data) {
        coinDropsResponse.data.forEach((drop: any) => {
          cards.push({
            id: drop._id || drop.storeName,
            title: drop.storeName || 'Coin Drop',
            subtitle: `${drop.multiplier}X - ${currencySymbol}${drop.boostedCashback} cashback`,
            icon: mapIconToIonicon(drop.icon || 'flash'),
            gradientColors: ['#ffe5a3', '#ffd97a', colors.lightMustard] as const,
            multiplier: drop.multiplier,
            type: 'coin_drop',
          });
        });
      }

      if (cards.length > 0) {
        if (!isMounted()) return;
        setCashbackData(cards);
      }
    } catch (error) {
      // Keep fallback data
    } finally {
      if (!isMounted()) return;
      setCashbackLoading(false);
    }
  }, [currencySymbol]);

  // Fetch offers from backend
  const fetchOffers = useCallback(async () => {
    if (activeTab !== 'offers') return;

    setLoading(true);
    try {
      const response = await realOffersApi.getOffers({
        page: 1,
        limit: 50,
      });

      if (response.success && response.data) {
        if (!isMounted()) return;

        // Normalize response data - handle both PaginatedResponse and Offer[] types
        const offersData: Offer[] = Array.isArray((response.data as any).items)
          ? (response.data as any).items
          : response.data as Offer[];

        setOffers(offersData);

        // Group offers by category and create category cards
        const categoryMap = new Map<string, { count: number; type: string }>();

        offersData.forEach((offer: Offer) => {
          const category = offer.category || 'general';
          const existing = categoryMap.get(category) || { count: 0, type: offer.type || 'discount' };
          categoryMap.set(category, {
            count: existing.count + 1,
            type: existing.type,
          });
        });

        // Create category cards from grouped offers
        const categories: CategoryCard[] = [];

        // Nearby Offers (offers with location)
        const nearbyCount = offersData.filter((o: Offer) => o.distance && o.distance < 5).length;
        if (nearbyCount > 0) {
          categories.push({
            id: 'nearby',
            title: 'Nearby Offers',
            subtitle: `${nearbyCount} offers`,
            icon: 'location-outline',
            iconColor: colors.infoScale[400],
            bgColor: '#1E3A8A',
            count: nearbyCount,
          });
        }

        // Today's Deals (offers expiring today or flash sales)
        const todayCount = offersData.filter((o: Offer) => {
          if (o.metadata?.flashSale?.isActive) return true;
          const endDate = new Date(o.validity.endDate);
          const today = new Date();
          return endDate.toDateString() === today.toDateString();
        }).length;
        if (todayCount > 0) {
          categories.push({
            id: 'today',
            title: "Today's Deals",
            subtitle: `${todayCount} offers`,
            icon: 'time-outline',
            iconColor: colors.lightMustard,
            bgColor: '#7C2D12',
            count: todayCount,
          });
        }

        // BOGO deals
        const bogoCount = offersData.filter((o: Offer) => o.type === 'combo' || o.title?.toLowerCase().includes('bogo')).length;
        if (bogoCount > 0) {
          categories.push({
            id: 'bogo',
            title: 'BOGO',
            subtitle: `${bogoCount} offers`,
            icon: 'pricetag-outline',
            iconColor: colors.lightMustard,
            bgColor: colors.nileBlue,
            badge: '2x',
            count: bogoCount,
          });
        }

        // Flash Sale
        const flashCount = offersData.filter((o: Offer) => o.metadata?.flashSale?.isActive).length;
        if (flashCount > 0) {
          categories.push({
            id: 'flash',
            title: 'Flash Sale',
            subtitle: `${flashCount} offers`,
            icon: 'flash-outline',
            iconColor: colors.error,
            bgColor: '#7F1D1D',
            count: flashCount,
          });
        }

        // Cashback offers
        const cashbackCount = offersData.filter((o: Offer) => o.type === 'cashback' || o.cashbackPercentage > 0).length;
        if (cashbackCount > 0) {
          categories.push({
            id: 'cashback',
            title: 'Super Cashback',
            subtitle: `${cashbackCount} offers`,
            icon: 'cash-outline',
            iconColor: colors.warningScale[400],
            bgColor: '#78350F',
            count: cashbackCount,
          });
        }

        // Freebies
        const freebieCount = offersData.filter((o: Offer) => 
          o.title?.toLowerCase().includes('free') || o.discountedPrice === 0
        ).length;
        if (freebieCount > 0) {
          categories.push({
            id: 'freebie',
            title: 'Freebies',
            subtitle: `${freebieCount} offers`,
            icon: 'gift-outline',
            iconColor: colors.brand.purpleMedium,
            bgColor: '#581C87',
            count: freebieCount,
          });
        }

        // If no categories found, add default ones
        if (categories.length === 0) {
          categories.push(
            {
              id: 'all',
              title: 'All Offers',
              subtitle: `${offersData.length} offers`,
              icon: 'grid-outline',
              iconColor: colors.nileBlue,
              bgColor: '#4C1D95',
              count: offersData.length,
            }
          );
        }

        setOfferCategories(categories);
      }
    } catch (error) {
      // On error, show default categories
      if (!isMounted()) return;
      setOfferCategories([
        {
          id: 'all',
          title: 'All Offers',
          subtitle: '0 offers',
          icon: 'grid-outline',
          iconColor: colors.nileBlue,
          bgColor: '#4C1D95',
          count: 0,
        },
      ]);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [activeTab]);

  // Refetch data when tab or region changes
  useEffect(() => {
    if (activeTab === 'offers') {
      fetchOffers();
    } else if (activeTab === 'cashback') {
      fetchCashbackData();
    } else if (activeTab === 'exclusive') {
      fetchExclusiveZones();
    }
  }, [activeTab, currentRegion, fetchOffers, fetchCashbackData, fetchExclusiveZones]);

  const handleViewAll = () => {
    if (activeTab === 'offers') {
      router.push('/offers' as any);
    } else if (activeTab === 'cashback') {
      router.push('/offers?tab=cashback' as any);
    } else {
      router.push('/offers' as any);
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    if (activeTab === 'offers') {
      router.push(`/offers?category=${categoryId}` as any);
    } else if (activeTab === 'cashback') {
      router.push(`/offers?tab=cashback&category=${categoryId}` as any);
    } else if (activeTab === 'exclusive') {
      // Use slug directly from API data
      router.push(`/offers/zones/${categoryId}` as any);
    }
  };

  // Handle exclusive zone press with verification check
  const handleExclusivePress = (zone: ExclusiveZoneCard) => {
    // Special profiles redirect to heroes page
    const heroesProfiles = ['defence', 'healthcare', 'teachers', 'government', 'differently-abled'];
    if (heroesProfiles.includes(zone.slug)) {
      router.push(`/offers/zones/heroes?profile=${zone.slug}` as any);
    } else {
      // Navigate to zone offers page - verification will be handled there
      router.push(`/offers/zones/${zone.slug}` as any);
    }
  };

  // Handle cashback card press
  const handleCashbackPress = (card: CashbackCard) => {
    if (card.type === 'double_cashback') {
      router.push('/offers?tab=cashback&filter=double' as any);
    } else if (card.type === 'coin_drop') {
      router.push('/offers?tab=cashback&filter=coindrops' as any);
    } else {
      router.push('/offers?tab=cashback' as any);
    }
  };

  // Generate gradient colors from bgColor - Lightened versions
  const getGradientColors = (bgColor: string, iconColor: string): [string, string, string] => {
    // Create lighter, pastel gradient variations based on the base color
    const colorMap: Record<string, [string, string, string]> = {
      '#1E3A8A': ['#93C5FD', colors.infoScale[400], colors.nileBlue], // Light Blue - Nearby
      '#7C2D12': ['#FED7AA', '#FDB573', '#FB923C'], // Light Orange - Today's
      '#14532D': ['#2d5c7e', colors.brand.nileBlueLight, colors.nileBlue], // Nile blue - BOGO
      '#7F1D1D': ['#FCA5A5', colors.errorScale[400], colors.error], // Light Red - Flash
      '#78350F': [colors.warningScale[200], '#FCD34D', colors.warningScale[400]], // Light Amber - Cashback
      '#581C87': ['#C4B5FD', colors.brand.purpleSoft, colors.nileBlue], // Light Purple - Freebies
      '#4C1D95': ['#DDD6FE', '#C4B5FD', colors.brand.purpleSoft], // Light Purple - All
    };
    return colorMap[bgColor] || [bgColor, bgColor, bgColor];
  };

  const renderCategoryCard = (category: CategoryCard) => {
    const gradientColors = getGradientColors(category.bgColor, category.iconColor);
    
    return (
      <Pressable
        key={category.id}
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(category.id)}
       
      >
        {category.badge && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{category.badge}</Text>
          </View>
        )}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryCardGradient}
        >
          <BlurView intensity={20} style={styles.categoryCardBlur} tint="light">
            <View style={styles.categoryCardContent}>
              <View style={styles.categoryIconContainer}>
                <Ionicons name={category.icon} size={18} color={COLORS.textDark} />
              </View>
              <View style={styles.categoryTextContainer}>
                <Text style={styles.categoryTitle} numberOfLines={1}>{category.title}</Text>
                <Text style={styles.categorySubtitle} numberOfLines={1}>{category.subtitle}</Text>
              </View>
              <View style={styles.categoryArrowContainer}>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textDark} />
              </View>
            </View>
          </BlurView>
        </LinearGradient>
      </Pressable>
    );
  };

  // Skeleton loading card
  const renderSkeletonCard = (index: number) => (
    <View key={`skeleton-${index}`} style={styles.exclusiveCard}>
      <LinearGradient
        colors={[colors.neutral[200], colors.neutral[100], colors.neutral[200]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.exclusiveCardGradient}
      >
        <View style={styles.exclusiveCardContent}>
          <Animated.View
            style={[
              styles.skeletonIcon,
              shimmerStyle
            ]}
          />
          <View style={styles.skeletonTextContainer}>
            <Animated.View
              style={[
                styles.skeletonTitle,
                shimmerStyle
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonSubtitle,
                shimmerStyle
              ]}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  // Render exclusive zone card with verification UI
  const renderExclusiveCard = (zone: ExclusiveZoneCard) => {
    // Use userEligible from API if available, otherwise fall back to local check
    const isEligible = zone.userEligible !== undefined
      ? zone.userEligible
      : checkUserVerification(zone.eligibilityType);
    const showLock = zone.verificationRequired && !isEligible;

    return (
      <Pressable
        key={zone.id}
        style={styles.exclusiveCard}
        onPress={() => handleExclusivePress(zone)}
       
      >
        {/* Lock badge for unverified zones */}
        {showLock && (
          <View style={styles.lockBadgeContainer}>
            <Ionicons name="lock-closed" size={12} color={colors.background.primary} />
          </View>
        )}
        <LinearGradient
          colors={zone.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.exclusiveCardGradient}
        >
          <BlurView intensity={20} style={styles.exclusiveCardBlur} tint="light">
            <View style={styles.exclusiveCardContent}>
              <View style={styles.exclusiveIconContainer}>
                <Ionicons name={zone.icon} size={18} color={COLORS.textDark} />
              </View>
              <View style={styles.exclusiveTextContainer}>
                <Text style={styles.exclusiveTitle} numberOfLines={1}>{zone.title}</Text>
                <Text style={styles.exclusiveSubtitle} numberOfLines={1}>
                  {showLock ? 'Verify to unlock' : zone.subtitle}
                </Text>
              </View>
              <View style={styles.exclusiveArrowContainer}>
                <Ionicons
                  name={showLock ? 'lock-closed-outline' : 'chevron-forward'}
                  size={14}
                  color={COLORS.textDark}
                />
              </View>
            </View>
          </BlurView>
        </LinearGradient>
      </Pressable>
    );
  };

  // Render cashback campaign card
  const renderCashbackCard = (card: CashbackCard) => (
    <Pressable
      key={card.id}
      style={styles.exclusiveCard}
      onPress={() => handleCashbackPress(card)}
     
    >
      {/* Multiplier badge */}
      {card.multiplier && (
        <View style={styles.multiplierBadgeContainer}>
          <Text style={styles.multiplierBadgeText}>{card.multiplier}X</Text>
        </View>
      )}
      <LinearGradient
        colors={card.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.exclusiveCardGradient}
      >
        <BlurView intensity={20} style={styles.exclusiveCardBlur} tint="light">
          <View style={styles.exclusiveCardContent}>
            <View style={styles.exclusiveIconContainer}>
              <Ionicons name={card.icon} size={18} color={COLORS.textDark} />
            </View>
            <View style={styles.exclusiveTextContainer}>
              <Text style={styles.exclusiveTitle} numberOfLines={1}>{card.title}</Text>
              <Text style={styles.exclusiveSubtitle} numberOfLines={1}>{card.subtitle}</Text>
            </View>
            <View style={styles.exclusiveArrowContainer}>
              <Ionicons name="chevron-forward" size={14} color={COLORS.textDark} />
            </View>
          </View>
        </BlurView>
      </LinearGradient>
    </Pressable>
  );

  // Handle individual offer press - navigate to offer detail
  const handleOfferPress = (offer: Offer) => {
    router.push(`/offers/${offer._id}` as any);
  };

  // Handle admin-managed item press
  const handleAdminItemPress = (item: any) => {
    // Track click
    if (item._id) {
      trackClick(item._id, activeTab);
    }

    if (item.navigationPath) {
      router.push(item.navigationPath as any);
    }
  };

  // Render admin-managed item card
  const renderAdminItem = (item: any) => {
    // Determine icon
    const getIconName = (): keyof typeof Ionicons.glyphMap => {
      if (item.iconType === 'ionicon') {
        return mapIconToIonicon(item.icon);
      }
      // For emoji or url types, use a default icon
      return 'apps-outline';
    };

    // Get gradient colors (with fallback)
    const gradientColors: readonly [string, string, string] =
      item.gradientColors?.length >= 3
        ? [item.gradientColors[0], item.gradientColors[1], item.gradientColors[2]] as const
        : [colors.neutral[200], colors.neutral[300], colors.neutral[400]] as const;

    // Check if verification is required and user is not verified
    const needsVerification = item.requiresVerification && item.verificationType !== 'none';
    const isVerified = needsVerification ? checkUserVerification(item.verificationType) : true;
    const showLock = needsVerification && !isVerified;

    // Build subtitle with count if enabled
    const subtitle = item.showCount && item.cachedCount > 0
      ? `${item.cachedCount} ${item.countLabel || 'offers'}`
      : item.subtitle;

    return (
      <Pressable
        key={item._id}
        style={styles.exclusiveCard}
        onPress={() => handleAdminItemPress(item)}
       
      >
        {/* Badge */}
        {item.badgeText && !showLock && (
          <View style={[styles.badgeContainer, item.badgeBg && { backgroundColor: item.badgeBg }]}>
            <Text style={[styles.badgeText, item.badgeColor && { color: item.badgeColor }]}>
              {item.badgeText}
            </Text>
          </View>
        )}
        {/* Lock badge for verification-required items */}
        {showLock && (
          <View style={styles.lockBadgeContainer}>
            <Ionicons name="lock-closed" size={12} color={colors.background.primary} />
          </View>
        )}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.exclusiveCardGradient}
        >
          <BlurView intensity={20} style={styles.exclusiveCardBlur} tint="light">
            <View style={styles.exclusiveCardContent}>
              <View style={styles.exclusiveIconContainer}>
                {item.iconType === 'emoji' ? (
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                ) : (
                  <Ionicons name={getIconName()} size={18} color={COLORS.textDark} />
                )}
              </View>
              <View style={styles.exclusiveTextContainer}>
                <Text style={styles.exclusiveTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.exclusiveSubtitle} numberOfLines={1}>
                  {showLock ? 'Verify to unlock' : subtitle}
                </Text>
              </View>
              <View style={styles.exclusiveArrowContainer}>
                <Ionicons
                  name={showLock ? 'lock-closed-outline' : 'chevron-forward'}
                  size={14}
                  color={COLORS.textDark}
                />
              </View>
            </View>
          </BlurView>
        </LinearGradient>
      </Pressable>
    );
  };

  // Render admin-managed items for a tab
  const renderAdminItems = (items: any[]) => {
    if (items.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No items available</Text>
        </View>
      );
    }

    // Split items into rows of 2 for horizontal scroll
    const rows = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(items.slice(i, i + 2));
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        contentContainerStyle={styles.exclusiveScrollContainer}
        style={styles.exclusiveScrollView}
      >
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.exclusiveRow}>
            {row.map(renderAdminItem)}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderContent = () => {
    // Render skeleton loading for any tab
    const renderSkeletonRows = () => (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        contentContainerStyle={styles.exclusiveScrollContainer}
        style={styles.exclusiveScrollView}
      >
        {[0, 1, 2, 3].map((_, rowIndex) => (
          <View key={rowIndex} style={styles.exclusiveRow}>
            {renderSkeletonCard(rowIndex * 2)}
            {renderSkeletonCard(rowIndex * 2 + 1)}
          </View>
        ))}
      </ScrollView>
    );

    // Show skeleton while loading section data
    if (sectionLoading) {
      return renderSkeletonRows();
    }

    // Show error state with retry button
    if (sectionError) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.errorText}>Couldn't load deals</Text>
          <Text style={styles.errorSubtext}>{sectionError}</Text>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    // Exclusive tab
    if (activeTab === 'exclusive') {
      // Use admin-managed items if available
      if (exclusiveTabItems.length > 0) {
        return renderAdminItems(exclusiveTabItems);
      }

      // Fall back to old behavior
      if (exclusiveLoading) {
        return renderSkeletonRows();
      }

      // Split zones into rows of 2 for horizontal scroll
      const rows = [];
      for (let i = 0; i < exclusiveZones.length; i += 2) {
        rows.push(exclusiveZones.slice(i, i + 2));
      }

      if (exclusiveZones.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No exclusive zones available</Text>
          </View>
        );
      }

      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.exclusiveScrollContainer}
          style={styles.exclusiveScrollView}
        >
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.exclusiveRow}>
              {row.map(renderExclusiveCard)}
            </View>
          ))}
        </ScrollView>
      );
    }

    // Cashback tab
    if (activeTab === 'cashback') {
      // Use admin-managed items if available
      if (cashbackTabItems.length > 0) {
        return renderAdminItems(cashbackTabItems);
      }

      // Fall back to old behavior
      if (cashbackLoading) {
        return renderSkeletonRows();
      }

      // Split cashback cards into rows of 2
      const rows = [];
      for (let i = 0; i < cashbackData.length; i += 2) {
        rows.push(cashbackData.slice(i, i + 2));
      }

      if (cashbackData.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No cashback campaigns available</Text>
          </View>
        );
      }

      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.exclusiveScrollContainer}
          style={styles.exclusiveScrollView}
        >
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.exclusiveRow}>
              {row.map(renderCashbackCard)}
            </View>
          ))}
        </ScrollView>
      );
    }

    // Offers tab
    // Use admin-managed items if available
    if (offersTabItems.length > 0) {
      return renderAdminItems(offersTabItems);
    }

    // Fall back to old behavior
    if (loading) {
      return renderSkeletonRows();
    }

    if (offerCategories.length === 0 && offers.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No offers available</Text>
        </View>
      );
    }

    // Show individual offers via OfferTile if we have them
    if (offers.length > 0) {
      // Show top offers (limit to 8 for homepage)
      const topOffers = offers.slice(0, 8);
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.offerTileScrollContent}
          style={styles.exclusiveScrollView}
        >
          {topOffers.map((offer) => (
            <View key={offer._id} style={styles.offerTileWrapper}>
              <OfferTile
                storeName={offer.store?.name || 'Store'}
                storeLogo={offer.store?.logo}
                distance={offer.distance}
                saveAmount={calculateSaveAmount({
                  cashbackPercent: offer.cashbackPercentage,
                  originalPrice: offer.originalPrice,
                  discountedPrice: offer.discountedPrice,
                })}
                cashbackPercent={offer.cashbackPercentage}
                badges={[
                  offer.exclusiveZone && { label: 'Exclusive', color: '#7C3AED' },
                  offer.metadata?.featured && { label: 'Featured', color: '#059669' },
                ].filter(Boolean) as any}
                expiryDate={offer.validity?.endDate}
                onPress={() => handleOfferPress(offer)}
                currencySymbol={currencySymbol}
              />
            </View>
          ))}
        </ScrollView>
      );
    }

    // Fallback to category cards
    const rows = [];
    for (let i = 0; i < offerCategories.length; i += 2) {
      rows.push(offerCategories.slice(i, i + 2));
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        contentContainerStyle={styles.exclusiveScrollContainer}
        style={styles.exclusiveScrollView}
      >
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.exclusiveRow}>
            {row.map(renderCategoryCard)}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Glassy background overlay */}
      <BlurView intensity={10} style={styles.blurOverlay} tint="light">
        <LinearGradient
          colors={[COLORS.white, COLORS.backgroundLight, COLORS.white]}
          style={styles.gradientOverlay}
        />
      </BlurView>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name={(sectionConfig?.icon || 'flash') as any} size={20} color={colors.lightPeach} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{sectionConfig?.title || 'Deals that save you money'}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{sectionConfig?.subtitle || 'Discover amazing offers & cashback'}</Text>
          </View>
        </View>
      </View>

      {/* Tabs - Dynamic based on admin config */}
      <View style={styles.tabsContainer}>
        {enabledTabs.length > 0 ? (
          // Render tabs from admin config
          enabledTabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as TabType)}
             
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.displayName}
              </Text>
            </Pressable>
          ))
        ) : (
          // Fallback to hardcoded tabs
          <>
            <Pressable
              style={[styles.tab, activeTab === 'offers' && styles.tabActive]}
              onPress={() => setActiveTab('offers')}
             
            >
              <Text style={[styles.tabText, activeTab === 'offers' && styles.tabTextActive]}>
                Offers
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'cashback' && styles.tabActive]}
              onPress={() => setActiveTab('cashback')}
             
            >
              <Text style={[styles.tabText, activeTab === 'cashback' && styles.tabTextActive]}>
                Cashback
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'exclusive' && styles.tabActive]}
              onPress={() => setActiveTab('exclusive')}
             
            >
              <Text style={[styles.tabText, activeTab === 'exclusive' && styles.tabTextActive]}>
                Exclusive
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Content */}
      <View style={styles.contentWrapper}>
        {renderContent()}
      </View>

      {/* View All Button - Moved to bottom */}
      {activeTab !== 'exclusive' && (
        <Pressable
          style={styles.viewAllButtonBottom}
          onPress={handleViewAll}
         
        >
          <LinearGradient
            colors={[colors.lightMustard, '#e6b84e', '#d4a847']}
            style={styles.viewAllGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.viewAllTextBottom}>View All {activeTab === 'offers' ? 'Offers' : 'Cashback'}</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.textDark} />
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginVertical: 12,
    marginHorizontal: 0,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    zIndex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    flexShrink: 1,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  contentWrapper: {
    minHeight: 180,
  },
  viewAllButtonBottom: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  viewAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  viewAllTextBottom: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    letterSpacing: 0.3,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    zIndex: 1,
    backgroundColor: COLORS.tabBg,
    padding: 4,
    borderRadius: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  categoriesScrollView: {
    marginHorizontal: -4,
  },
  categoriesContainer: {
    paddingRight: 16,
    paddingLeft: 4,
    gap: 14,
  },
  categoryCard: {
    width: 220,
    minHeight: 100,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  categoryCardGradient: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryCardBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
    minHeight: 100,
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    flexShrink: 0,
  },
  categoryTextContainer: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  categorySubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  categoryArrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    flexShrink: 0,
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.lightPeach,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.white,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: colors.lightPeach,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: 0.5,
  },
  // Lock badge for verification-required zones
  lockBadgeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Multiplier badge for cashback cards
  multiplierBadgeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.lightMustard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  multiplierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: 0.5,
  },
  // Skeleton loading styles
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.neutral[300],
  },
  skeletonTextContainer: {
    flex: 1,
    gap: 6,
  },
  skeletonTitle: {
    width: '70%',
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.neutral[300],
  },
  skeletonSubtitle: {
    width: '50%',
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.neutral[300],
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  // Error state styles
  errorContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  errorSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  // Exclusive tab styles
  exclusiveScrollView: {
    marginHorizontal: -4,
  },
  exclusiveScrollContainer: {
    paddingRight: 16,
    paddingLeft: 4,
    gap: 12,
  },
  offerTileScrollContent: {
    paddingRight: 16,
    paddingLeft: 4,
    gap: 10,
  },
  offerTileWrapper: {
    width: 180,
  },
  exclusiveRow: {
    flexDirection: 'column',
    gap: 12,
    marginRight: 12,
  },
  exclusiveCard: {
    width: 220,
    minHeight: 100,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  exclusiveCardGradient: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  exclusiveCardBlur: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  exclusiveCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
    minHeight: 100,
  },
  exclusiveIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    flexShrink: 0,
  },
  exclusiveTextContainer: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
  },
  exclusiveTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  exclusiveSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  exclusiveArrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    flexShrink: 0,
  },
});

export default React.memo(DealsThatSaveMoney);
