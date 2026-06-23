import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import { useRezBalance, useWalletData, useBrandedCoins, useRefreshWallet, useSavingsInsights, useGetCurrencySymbol, useRegionState, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { formatTimeLeft } from '@/types/playandearn.types';
import { colors } from '@/constants/theme';
import type { QuickAction } from '@/services/quickActionsApi';
import type { SpecialProgramSlug, ProgramListItem } from '@/services/specialProgramApi';
import type { LiveTournament } from '@/services/tournamentApi';
import creatorsApiService from '@/services/creatorsApi';
import type { Creator, CreatorPick } from '@/services/creatorsApi';
import realOffersApi from '@/services/realOffersApi';

import {
  useGamesData,
  useChallengesData,
  useAchievementsData,
  useStreakData,
  useCreatorsData,
  useProgramsData,
  useBonusData,
  useQuickActionsData,
} from './queries/playAndEarn';

// ─── Exported types (kept for backward compat) ───

export type { DisplayAchievement } from './queries/playAndEarn/useAchievementsData';
export type { DisplayChallenge } from './queries/playAndEarn/useChallengesData';

// ─── Exported constants ───

export const GAME_COLORS: [string, string][] = [
  [colors.brand.purple, colors.brand.purpleMedium],
  [colors.brand.pink, '#F472B6'],
  [colors.warningScale[400], colors.warningScale[400]],
  [colors.successScale[400], colors.successScale[400]],
  [colors.infoScale[400], colors.infoScale[400]],
  [colors.error, colors.errorScale[400]],
];

export const IconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  'zap': 'flash',
  'shopping-bag': 'bag',
  'qr-code': 'qr-code',
  'share': 'share-social',
  'star': 'star',
  'users': 'people',
  'calendar': 'calendar',
  'lock': 'lock-closed',
  'heart': 'heart',
  'camera': 'camera',
  'message': 'chatbubble',
  'target': 'locate',
  'award': 'ribbon',
  'flame': 'flame',
  'clock': 'time',
  'chevron-right': 'chevron-forward',
  'check-circle': 'checkmark-circle',
  'sparkles': 'sparkles',
  'store': 'storefront',
  'upload': 'cloud-upload',
  'party': 'happy',
  'graduation': 'school',
  'briefcase': 'briefcase',
  'crown': 'diamond',
  'map-pin': 'location',
  'thumbs-up': 'thumbs-up',
  'video': 'videocam',
  'arrow-right': 'arrow-forward',
  'ticket': 'ticket',
  'gamepad': 'game-controller',
  'trophy': 'trophy',
  'coins': 'cash',
};

// ─── Fallback data ───

function buildFallbackQuickEarnActions(currencySymbol: string): QuickAction[] {
  return [
    {
      _id: 'scan-pay',
      slug: 'scan-pay',
      icon: 'qr-code',
      title: 'Scan & Pay at Store',
      subtitle: `Up to 10% ${BRAND.COIN_NAME}`,
      iconColor: colors.lightMustard,
      deepLinkPath: '/pay-in-store',
      targetAchievementTypes: [],
      priority: 1,
    },
    {
      _id: 'upload-bill',
      slug: 'upload-bill',
      icon: 'cloud-upload',
      title: 'Upload Bill',
      subtitle: `Earn ${currencySymbol}50-${currencySymbol}200 Coins`,
      iconColor: colors.infoScale[400],
      deepLinkPath: '/bill-upload',
      targetAchievementTypes: [],
      priority: 2,
    },
    {
      _id: 'share-offer',
      slug: 'share-offer',
      icon: 'share-social',
      title: 'Share an Offer',
      subtitle: `Earn 20 ${BRAND.COIN_NAME}`,
      iconColor: colors.brand.purpleMedium,
      deepLinkPath: '/referral',
      targetAchievementTypes: [],
      priority: 3,
    },
    {
      _id: 'write-review',
      slug: 'write-review',
      icon: 'star',
      title: 'Write a Review',
      subtitle: 'Earn 25-100 Coins',
      iconColor: colors.warningScale[400],
      deepLinkPath: '/explore/review-earn',
      targetAchievementTypes: [],
      priority: 4,
    },
    {
      _id: 'refer-friend',
      slug: 'refer-friend',
      icon: 'people',
      title: 'Refer a Friend',
      subtitle: 'Earn 100 Coins',
      iconColor: colors.brand.pink,
      deepLinkPath: '/referral',
      targetAchievementTypes: [],
      priority: 5,
    },
    {
      _id: 'daily-checkin',
      slug: 'daily-checkin',
      icon: 'calendar',
      title: 'Daily Check-in',
      subtitle: 'Earn 10-500 Coins',
      iconColor: colors.tealGreen,
      deepLinkPath: '/explore/daily-checkin',
      targetAchievementTypes: [],
      priority: 6,
    },
  ] as QuickAction[];
}

const defaultShoppingMethods = [
  {
    id: 'online-shopping',
    icon: 'bag' as keyof typeof Ionicons.glyphMap,
    title: `Shop Online via ${BRAND.APP_NAME}`,
    description: 'Amazon, Flipkart, Myntra & more',
    reward: 'Up to 8% Cashback',
    extraReward: '+ Branded Coins',
    path: '/cash-store',
  },
  {
    id: 'offline-payment',
    icon: 'storefront' as keyof typeof Ionicons.glyphMap,
    title: 'Pay at Partner Stores',
    description: `Instant ${BRAND.COIN_NAME} on every purchase`,
    reward: 'Always Better Price',
    extraReward: '+ First visit bonus',
    path: '/pay-in-store',
  },
  {
    id: 'lock-price',
    icon: 'lock-closed' as keyof typeof Ionicons.glyphMap,
    title: 'Lock Price Deals',
    description: 'Lock with 10%, earn on both actions',
    reward: 'Double Earnings',
    extraReward: '+ Pickup bonus',
    path: '/lock-deals',
  },
];

export const socialActions = [
  { icon: 'share-social' as keyof typeof Ionicons.glyphMap, title: 'Share Store/Offer', coins: '20-50', description: 'Friends must view', path: '/earn/share' },
  { icon: 'thumbs-up' as keyof typeof Ionicons.glyphMap, title: 'Vote in Polls', coins: '10', description: 'Daily polls available', path: '/earn/polls' },
  { icon: 'chatbubble' as keyof typeof Ionicons.glyphMap, title: 'Comment on Offers', coins: '15', description: 'Quality comments', path: '/earn/offer-comments' },
  { icon: 'camera' as keyof typeof Ionicons.glyphMap, title: 'Upload Photos', coins: '25-100', description: 'Store/product photos', path: '/earn/photo-upload' },
  { icon: 'videocam' as keyof typeof Ionicons.glyphMap, title: 'Create Reels', coins: '50-200', description: 'UGC content rewards', path: '/social/reels' },
  { icon: 'heart' as keyof typeof Ionicons.glyphMap, title: 'Rate Events', coins: '20', description: 'After event attendance', path: '/events' },
];

export const specialPrograms = [
  {
    id: 'student',
    icon: 'school' as keyof typeof Ionicons.glyphMap,
    title: 'Student Zone',
    badge: '\u{1F393}',
    rewards: ['Student of the Month', 'Event participation', 'Campus ambassador'],
    earnings: 'Up to 5,000 coins/month',
    path: '/offers/zones/student',
  },
  {
    id: 'corporate',
    icon: 'briefcase' as keyof typeof Ionicons.glyphMap,
    title: 'Corporate Perks',
    badge: '\u{1F9D1}\u200D\u{1F4BC}',
    rewards: ['Employee of the Month', 'Corporate events', 'Exclusive BNPL'],
    earnings: 'Up to 3,000 coins/month',
    path: '/offers/zones/corporate',
  },
  {
    id: 'prive',
    icon: 'diamond' as keyof typeof Ionicons.glyphMap,
    title: BRAND.PRIVE_NAME,
    badge: '\u{1F451}',
    rewards: ['Premium campaigns', 'High multipliers', 'Brand collaborations'],
    earnings: 'Unlimited potential',
    path: '/prive',
  },
];

// ─── The hook (thin wrapper over 8 micro-query hooks) ───

export function usePlayAndEarnData() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const getCurrencySymbol = useGetCurrencySymbol();
  const regionState = useRegionState();
  const currencySymbol = getCurrencySymbol();

  const replaceCurrencySymbol = useCallback((value: string): string => {
    if (!value) return value;
    return value
      .replace(/\u20B9/g, currencySymbol)
      .replace(/AED\s*/g, currencySymbol)
      .replace(/\u062F\.\u0625\s*/g, currencySymbol);
  }, [currencySymbol]);

  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const rezCoins = useRezBalance();
  const walletData = useWalletData();
  const brandedCoinsFromCtx = useBrandedCoins();
  const refreshWallet = useRefreshWallet();
  const savingsInsights = useSavingsInsights();
  const totalBrandedCoins = useMemo(() => brandedCoinsFromCtx?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0, [brandedCoinsFromCtx]);
  const totalPromoCoins = useMemo(() => walletData?.coins?.find(c => c.type === 'promo')?.amount || 0, [walletData?.coins]);
  const monthlyEarnings = savingsInsights?.thisMonth || 0;

  // 8 react-query hooks
  const games = useGamesData();
  const challenges = useChallengesData();
  const achievementsQuery = useAchievementsData();
  const streak = useStreakData();
  const creators = useCreatorsData();
  const programs = useProgramsData();
  const bonus = useBonusData(regionState?.currentRegion);
  const quickActionsQuery = useQuickActionsData();

  // Exclusive zones (fetched from API)
  const [exclusiveZones, setExclusiveZones] = useState<any[]>([]);
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    realOffersApi.getExclusiveZones().then(res => {
      if (res.success && res.data) setExclusiveZones(res.data);
    }).catch(() => {});
  }, [authLoading, isAuthenticated]);

  // Liked picks (local state, not from API)
  const [likedPicks, setLikedPicks] = useState<Set<string>>(new Set());

  // Special programs selection (local UI state)
  const [selectedProgramSlug, setSelectedProgramSlug] = useState<SpecialProgramSlug | null>(null);

  // Live countdown timer for tournaments
  const [liveTournaments, setLiveTournaments] = useState<LiveTournament[]>([]);
  const tournamentsFromQuery = games.data?.tournaments || [];

  useEffect(() => {
    setLiveTournaments(tournamentsFromQuery);
  }, [tournamentsFromQuery]);

  useEffect(() => {
    if (liveTournaments.length === 0) return;
    const interval = setInterval(() => {
      setLiveTournaments(prev => prev.map(t => {
        const dateToUse = t.status === 'active' ? t.endDate : t.startDate;
        if (!dateToUse) return t;
        const { formatted } = formatTimeLeft(dateToUse);
        return {
          ...t,
          endsIn: t.status === 'active' ? formatted : t.endsIn,
          startsIn: t.status === 'upcoming' ? formatted : t.startsIn,
        };
      }).filter(t => {
        if (t.status === 'active' && t.endDate) {
          const { formatted } = formatTimeLeft(t.endDate);
          return formatted !== 'Ended';
        }
        return true;
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, [liveTournaments.length]);

  // Lazy loading: delay below-fold sections
  const [belowFoldReady, setBelowFoldReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const markReady = () => { if (!cancelled) setBelowFoldReady(true); };
    const timeout = setTimeout(markReady, 500);
    const handle = InteractionManager.runAfterInteractions(markReady);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      handle.cancel();
    };
  }, []);

  // Combined loading / refreshing state
  const loading = games.isLoading || challenges.isLoading || achievementsQuery.isLoading || streak.isLoading || creators.isLoading || programs.isLoading || bonus.isLoading || quickActionsQuery.isLoading;
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refreshWallet().catch(() => {});
    queryClient.invalidateQueries({ queryKey: queryKeys.playAndEarn.all }).finally(() => {
      setRefreshing(false);
    });
  }, [queryClient, refreshWallet]);

  // Computed values
  const fallbackQuickEarnActions = useMemo(() => buildFallbackQuickEarnActions(currencySymbol), [currencySymbol]);
  const apiQuickActions = quickActionsQuery.data?.quickActions || [];
  const resolvedQuickActions = apiQuickActions.length > 0 ? apiQuickActions : fallbackQuickEarnActions;

  const apiShoppingMethods = programs.data?.shoppingMethods || null;
  const shoppingMethods = apiShoppingMethods
    ? apiShoppingMethods.map(m => ({
        ...m,
        icon: (m.icon || 'bag') as keyof typeof Ionicons.glyphMap,
      }))
    : defaultShoppingMethods;

  // Navigation
  const navigateTo = useCallback((path: string) => {
    router.push(path as any);
  }, [router]);

  // Toggle like on a trending pick with optimistic UI
  const handlePickLike = useCallback(async (pickId: string) => {
    const wasLiked = likedPicks.has(pickId);
    setLikedPicks(prev => {
      const next = new Set(prev);
      if (wasLiked) next.delete(pickId);
      else next.add(pickId);
      return next;
    });
    const response = await creatorsApiService.togglePickLike(pickId);
    if (!response.success) {
      setLikedPicks(prev => {
        const next = new Set(prev);
        if (wasLiked) next.add(pickId);
        else next.delete(pickId);
        return next;
      });
    }
  }, [likedPicks]);

  // Refresh special programs after status change
  const refreshSpecialPrograms = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.playAndEarn.programs() });
  }, [queryClient]);

  return {
    // Loading state
    loading,
    refreshing,
    handleRefresh,
    belowFoldReady,

    // Wallet data
    rezCoins,
    totalBrandedCoins,
    totalPromoCoins,
    currencySymbol,
    monthlyEarnings,

    // Games
    allGames: games.data?.games || [],

    // Challenges & achievements
    challenges: challenges.data || [],
    achievements: achievementsQuery.data?.achievements || [],
    myRank: achievementsQuery.data?.myRank ?? null,

    // Creators
    featuredCreators: creators.data?.featuredCreators || [],
    trendingPicks: creators.data?.trendingPicks || [],
    likedPicks,
    creatorStatus: creators.data?.creatorStatus || 'none',
    handlePickLike,

    // Quick earn
    resolvedQuickActions,

    // Daily streak
    currentStreak: streak.data?.currentStreak || 0,
    hasCheckedInToday: streak.data?.hasCheckedInToday || false,
    streakBonusMilestones: streak.data?.streakBonusMilestones || [
      { day: 3, coins: 50, completed: false },
      { day: 7, coins: 200, completed: false },
      { day: 14, coins: 500, completed: false },
      { day: 30, coins: 2000, completed: false, special: true },
      { day: 60, coins: 5000, completed: false, special: true },
      { day: 100, coins: 10000, completed: false, special: true },
    ],

    // Shopping
    shoppingMethods,

    // Social
    socialActions,
    socialImpactPreview: creators.data?.socialImpactPreview || [],

    // Special programs
    specialPrograms,
    apiSpecialPrograms: programs.data?.apiSpecialPrograms || [],
    specialProgramsLoaded: !programs.isLoading,
    selectedProgramSlug,
    setSelectedProgramSlug,
    refreshSpecialPrograms,

    // Events
    eventCategories: programs.data?.eventCategories || [],
    eventRewardConfig: programs.data?.eventRewardConfig || null,

    // Bonus
    bonusCampaigns: bonus.data?.bonusCampaigns || [],
    bonusOpportunities: bonus.data?.bonusOpportunities || [],
    replaceCurrencySymbol,

    // Tournaments
    tournaments: liveTournaments,

    // Value cards
    valueCards: quickActionsQuery.data?.valueCards || [],

    // Exclusive zones
    exclusiveZones,

    // Navigation
    navigateTo,
  };
}
