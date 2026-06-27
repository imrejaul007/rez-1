/**
 * usePriveSection Hook
 * Data & state management for Privé section
 * Integrates with backend Privé APIs for real-time data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuthUser, useIsAuthenticated, useRefreshWallet } from '@/stores/selectors';
import { usePriveEligibility } from './usePriveEligibility';
import { PILLAR_CONFIG } from '@/components/prive/priveTheme';
import priveApi, {
  PriveOffer as ApiPriveOffer,
  HighlightItem as ApiHighlightItem,
  Highlights as ApiHighlights,
  HabitLoop as ApiHabitLoop,
  CheckInResponse,
  PriveDashboard,
} from '@/services/priveApi';

// Types
interface PriveOffer {
  id: string;
  brand: string;
  title: string;
  subtitle: string;
  reward: string;
  expiresIn: string;
  isExclusive: boolean;
}

interface HighlightItem {
  id: string;
  type: 'offer' | 'store' | 'campaign';
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
}

interface WeeklyEarningsData {
  thisWeek: number;
  lastWeek: number;
  percentChange: number;
  breakdown: Record<string, number>;
}

interface HabitLoop {
  id: string;
  name: string;
  icon: string;
  completed: boolean;
  progress: number;
  description?: string;
  deepLink?: string;
}

interface PillarData {
  id: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
}

interface PriveUserData {
  name: string;
  tier: string;
  tierProgress: number;
  nextTier: string;
  pointsToNext: number;
  totalCoins: number;
  rezCoins: number;
  priveCoins: number;
  brandedCoins: number;
  monthlyEarnings: number;
  activeCampaigns: number;
  completedCampaigns: number;
  avgRating: number | null;
  memberId: string;
  memberSince: string;
  validThru: string;
  totalScore: number;
  accessState: 'active' | 'building' | 'paused' | 'none';
  pillars: PillarData[];
}

interface DailyProgress {
  isCheckedIn: boolean;
  streak: number;
  weeklyEarnings: WeeklyEarningsData;
  loops: HabitLoop[];
  allCompleted: boolean;
}

interface UsePriveSectionReturn {
  // User data
  userData: PriveUserData;
  eligibility: ReturnType<typeof usePriveEligibility>['eligibility'];

  // Offers
  featuredOffers: PriveOffer[];

  // Highlights
  highlights: {
    curatedOffer: HighlightItem | null;
    nearbyStore: HighlightItem | null;
    opportunity: HighlightItem | null;
  };

  // Habits
  dailyProgress: DailyProgress;

  // States
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  checkIn: () => Promise<void>;
  trackOfferClick: (offerId: string) => void;
  handleLoopPress: (loopId: string) => void;
  handleEarningsPress: () => void;
}

// Empty default user data (no mock data)
const createEmptyUserData = (userName: string): PriveUserData => ({
  name: userName || 'Privé Member',
  tier: 'None',
  tierProgress: 0,
  nextTier: 'Entry',
  pointsToNext: 0,
  totalCoins: 0,
  rezCoins: 0,
  priveCoins: 0,
  brandedCoins: 0,
  monthlyEarnings: 0,
  activeCampaigns: 0,
  completedCampaigns: 0,
  avgRating: null,
  memberId: '',
  memberSince: '',
  validThru: '',
  totalScore: 0,
  accessState: 'building',
  pillars: [],
});

export const usePriveSection = (): UsePriveSectionReturn => {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const {
    eligibility,
    refresh: refreshEligibility,
  } = usePriveEligibility();
  const refreshWallet = useRefreshWallet();

  // Track if initial fetch has been done
  const hasFetchedRef = useRef(false);

  // Start with loading true — real data must be fetched
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State - initialized with empty defaults (no mock data)
  const [userData, setUserData] = useState<PriveUserData>(
    createEmptyUserData(user?.name || 'Privé Member')
  );
  const [featuredOffers, setFeaturedOffers] = useState<PriveOffer[]>([]);
  const [highlights, setHighlights] = useState<{
    curatedOffer: HighlightItem | null;
    nearbyStore: HighlightItem | null;
    opportunity: HighlightItem | null;
  }>({ curatedOffer: null, nearbyStore: null, opportunity: null });
  const [dailyProgress, setDailyProgress] = useState<DailyProgress>({
    isCheckedIn: false,
    streak: 0,
    weeklyEarnings: { thisWeek: 0, lastWeek: 0, percentChange: 0, breakdown: {} },
    loops: [],
    allCompleted: false,
  });

  // Transform API offer to local format
  const transformOffer = (offer: ApiPriveOffer): PriveOffer => ({
    id: offer.id,
    brand: offer.brand,
    title: offer.title,
    subtitle: offer.subtitle,
    reward: offer.reward,
    expiresIn: offer.expiresIn,
    isExclusive: offer.isExclusive,
  });

  // Transform API highlight to local format
  const transformHighlight = (highlight: ApiHighlightItem): HighlightItem => ({
    id: highlight.id,
    type: highlight.type,
    icon: highlight.icon,
    title: highlight.title,
    subtitle: highlight.subtitle,
    badge: highlight.badge,
    badgeColor: highlight.badgeColor,
  });

  // Fetch dashboard data from backend
  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);

    try {
      const response = await priveApi.getDashboard();

      if (response.success && response.data) {
        const dashboard = response.data;

        // Update user data
        if (dashboard.user) {
          setUserData(prev => ({
            ...prev,
            name: dashboard.user.name || prev.name,
            memberId: dashboard.user.memberId || prev.memberId,
            memberSince: dashboard.user.memberSince || prev.memberSince,
            validThru: dashboard.user.validThru || prev.validThru,
            tierProgress: dashboard.user.tierProgress ?? prev.tierProgress,
            pointsToNext: dashboard.user.pointsToNext ?? prev.pointsToNext,
            nextTier: dashboard.user.nextTier || prev.nextTier,
          }));
        }

        // Update coins
        if (dashboard.coins) {
          setUserData(prev => ({
            ...prev,
            totalCoins: dashboard.coins.total,
            rezCoins: dashboard.coins.rez,
            priveCoins: dashboard.coins.prive,
            brandedCoins: dashboard.coins.branded,
          }));
        }

        // Update stats
        if (dashboard.stats) {
          setUserData(prev => ({
            ...prev,
            activeCampaigns: dashboard.stats.activeCampaigns,
            completedCampaigns: dashboard.stats.completedCampaigns,
            avgRating: dashboard.stats.avgRating ?? null,
          }));
        }

        // Update featured offers
        setFeaturedOffers(
          dashboard.featuredOffers?.length
            ? dashboard.featuredOffers.map(transformOffer)
            : []
        );

        // Update highlights (may be null from backend)
        if (dashboard.highlights) {
          setHighlights({
            curatedOffer: dashboard.highlights.curatedOffer ? transformHighlight(dashboard.highlights.curatedOffer) : null,
            nearbyStore: dashboard.highlights.nearbyStore ? transformHighlight(dashboard.highlights.nearbyStore) : null,
            opportunity: dashboard.highlights.opportunity ? transformHighlight(dashboard.highlights.opportunity) : null,
          });
        }

        // Update daily progress
        if (dashboard.dailyProgress) {
          // Parse weeklyEarnings with backward compatibility (number → object)
          const rawEarnings = dashboard.dailyProgress.weeklyEarnings;
          const weeklyEarnings: WeeklyEarningsData = typeof rawEarnings === 'number'
            ? { thisWeek: rawEarnings, lastWeek: 0, percentChange: 0, breakdown: {} }
            : (rawEarnings as WeeklyEarningsData);

          setDailyProgress({
            isCheckedIn: dashboard.dailyProgress.isCheckedIn,
            streak: dashboard.dailyProgress.streak,
            weeklyEarnings,
            loops: (dashboard.dailyProgress.loops || []).map(loop => ({
              id: loop.id,
              name: loop.name,
              icon: loop.icon,
              completed: loop.completed,
              progress: loop.progress,
              description: (loop as any).description,
              deepLink: (loop as any).deepLink,
            })),
            allCompleted: (dashboard.dailyProgress as any).allCompleted || false,
          });
        }

        setError(null);
      }
    } catch (err) {
      setError('Failed to load Privé data');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Update user name when auth changes
  useEffect(() => {
    if (user?.name) {
      setUserData(prev => ({
        ...prev,
        name: user?.name || 'Privé Member',
      }));
    }
  }, [user?.name]);

  // Update pillars when eligibility changes (in background)
  useEffect(() => {
    if (eligibility.pillars && eligibility.pillars.length > 0) {
      setUserData(prev => ({
        ...prev,
        totalScore: eligibility.score,
        tier: eligibility.tier === 'elite' ? 'Elite' :
              eligibility.tier === 'signature' ? 'Signature' :
              eligibility.tier === 'entry' ? 'Entry' : 'None',
        pillars: eligibility.pillars.map(p => ({
          id: p.id,
          score: p.score,
          trend: p.trend,
        })),
      }));
    }
  }, [eligibility]);

  // Initial fetch - runs once when authenticated
  useEffect(() => {
    if (isAuthenticated && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      // Fetch in background without blocking UI
      fetchDashboardData();
    }
  }, [isAuthenticated, fetchDashboardData]);

  // Refresh function
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await Promise.all([
        refreshEligibility(),
        fetchDashboardData(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshEligibility, fetchDashboardData]);

  // Check-in function - now uses real API
  const checkIn = useCallback(async () => {
    try {
      const response = await priveApi.checkIn();

      if (response.success && response.data) {
        const { currentStreak, coinsEarned, totalEarned, message } = response.data;

        // Update daily progress
        setDailyProgress(prev => ({
          ...prev,
          isCheckedIn: true,
          streak: currentStreak,
        }));

        // Update coins earned
        setUserData(prev => ({
          ...prev,
          rezCoins: prev.rezCoins + totalEarned,
          totalCoins: prev.totalCoins + totalEarned,
          monthlyEarnings: prev.monthlyEarnings + totalEarned,
        }));


        // Sync wallet after earning coins
        refreshWallet().catch(() => {});
      }
    } catch (err) {
      // Don't fabricate streak data on failure — show error
      setError('Check-in failed. Please try again.');
    }
  }, [refreshWallet]);

  // Track offer click - now uses real API
  const trackOfferClick = useCallback(async (offerId: string) => {
    try {
      await priveApi.trackOfferClick(offerId);
    } catch (_err) {
      // silently handle
    }
  }, []);

  // Navigate to the action screen for a habit loop
  const handleLoopPress = useCallback((loopId: string) => {
    const loop = dailyProgress.loops.find(l => l.id === loopId);
    const fallback: Record<string, string> = {
      smart_spend: '/prive/smart-spend',
      influence: '/prive/review-earn',
      redemption_pride: '/prive/redeem',
      network: '/referral',
    };
    const target = loop?.deepLink || fallback[loopId];
    if (target) router.push(target as any);
  }, [dailyProgress.loops, router]);

  // Navigate to the earnings page
  const handleEarningsPress = useCallback(() => {
    router.push('/my-earnings' as any);
  }, [router]);

  return {
    userData,
    eligibility,
    featuredOffers,
    highlights,
    dailyProgress,
    isLoading,
    isRefreshing,
    error,
    refresh,
    checkIn,
    trackOfferClick,
    handleLoopPress,
    handleEarningsPress,
  };
};

export default usePriveSection;
