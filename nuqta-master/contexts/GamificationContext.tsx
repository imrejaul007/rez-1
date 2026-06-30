import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import achievementApi, { Achievement, AchievementProgress } from '@/services/achievementApi';
import pointsApi, { PointsBalance, PointTransaction } from '@/services/pointsApi';

import challengesApi from '@/services/challengesApi';
import coinSyncService from '@/services/coinSyncService';
import { useIsAuthenticated, useIsOnboarded } from '@/stores/selectors';
import { useWalletContext } from './WalletContext';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useToastStore } from '@/stores/toastStore';

// Feature flags for gradual rollout
const GAMIFICATION_FLAGS = {
  ENABLE_ACHIEVEMENTS: true,
  ENABLE_COINS: true,
  ENABLE_CHALLENGES: true,
  ENABLE_LEADERBOARD: true,
  ENABLE_NOTIFICATIONS: true,
};

// Types - Use PointsBalance from API but SOURCE from Wallet API
export type CoinBalance = PointsBalance;

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  progress: number;
  target: number;
  reward: number;
  expiresAt: string;
  completed: boolean;
}

export interface AchievementUnlock {
  achievement: Achievement;
  timestamp: string;
  shown: boolean;
}

interface GamificationState {
  achievements: Achievement[];
  achievementProgress: AchievementProgress | null;
  coinBalance: CoinBalance;
  challenges: Challenge[];
  achievementQueue: AchievementUnlock[];
  dailyStreak: number;
  lastLoginDate: string | null;
  isLoading: boolean;
  error: string | null;
  featureFlags: typeof GAMIFICATION_FLAGS;
}

type GamificationAction =
  | { type: 'GAMIFICATION_LOADING'; payload: boolean }
  | { type: 'ACHIEVEMENTS_LOADED'; payload: { achievements: Achievement[]; progress: AchievementProgress } }
  | { type: 'COINS_LOADED'; payload: CoinBalance }
  | { type: 'CHALLENGES_LOADED'; payload: Challenge[] }
  | { type: 'ACHIEVEMENT_UNLOCKED'; payload: Achievement }
  | { type: 'ACHIEVEMENT_SHOWN'; payload: string }
  | { type: 'COINS_EARNED'; payload: number }
  | { type: 'COINS_SPENT'; payload: number }
  | { type: 'STREAK_UPDATED'; payload: { streak: number; loginDate: string } }
  | { type: 'STREAK_OPTIMISTIC'; payload: { streak: number; loginDate: string } }
  | { type: 'STREAK_REVERT'; payload: { streak: number; loginDate: string } }
  | { type: 'CHALLENGE_PROGRESS'; payload: { challengeId: string; progress: number } }
  | { type: 'CHALLENGE_COMPLETED_OPTIMISTIC'; payload: string }
  | { type: 'GAMIFICATION_ERROR'; payload: string }
  | { type: 'CLEAR_GAMIFICATION' }
  | { type: 'CLEAR_ERROR' };

// Storage keys
const STORAGE_KEYS = {
  ACHIEVEMENTS: 'gamification_achievements',
  COINS: 'gamification_coins',
  CHALLENGES: 'gamification_challenges',
  STREAK: 'gamification_streak',
  LAST_LOGIN: 'gamification_last_login',
  CACHE_TIME: 'gamification_cache_time',
};

// Cache duration (10 minutes)
const CACHE_DURATION = 10 * 60 * 1000;

// Initial state
const initialState: GamificationState = {
  achievements: [],
  achievementProgress: null,
  coinBalance: { total: 0, earned: 0, spent: 0, pending: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
  challenges: [],
  achievementQueue: [],
  dailyStreak: 0,
  lastLoginDate: null,
  isLoading: false,
  error: null,
  featureFlags: GAMIFICATION_FLAGS,
};

// Reducer
function gamificationReducer(state: GamificationState, action: GamificationAction): GamificationState {
  switch (action.type) {
    case 'GAMIFICATION_LOADING':
      return { ...state, isLoading: action.payload, error: null };

    case 'ACHIEVEMENTS_LOADED':
      return {
        ...state,
        achievements: action.payload.achievements,
        achievementProgress: action.payload.progress,
        isLoading: false,
        error: null,
      };

    case 'COINS_LOADED':
      return {
        ...state,
        coinBalance: action.payload,
      };

    case 'CHALLENGES_LOADED':
      return {
        ...state,
        challenges: action.payload,
      };

    case 'ACHIEVEMENT_UNLOCKED':
      return {
        ...state,
        achievements: state.achievements.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
        achievementQueue: [
          ...state.achievementQueue,
          {
            achievement: action.payload,
            timestamp: new Date().toISOString(),
            shown: false,
          },
        ],
      };

    case 'ACHIEVEMENT_SHOWN': {
      const updatedQueue = state.achievementQueue.map((item) =>
        item.achievement.id === action.payload ? { ...item, shown: true } : item
      );
      // Remove shown achievements to prevent unbounded queue growth
      const trimmedQueue = updatedQueue.filter((item) => !item.shown);
      return {
        ...state,
        achievementQueue: trimmedQueue,
      };
    }

    case 'COINS_EARNED':
      return {
        ...state,
        coinBalance: {
          ...state.coinBalance,
          total: state.coinBalance.total + action.payload,
          earned: state.coinBalance.earned + action.payload,
        },
      };

    case 'COINS_SPENT':
      return {
        ...state,
        coinBalance: {
          ...state.coinBalance,
          total: state.coinBalance.total - action.payload,
          spent: state.coinBalance.spent + action.payload,
        },
      };

    case 'STREAK_UPDATED':
      return {
        ...state,
        dailyStreak: action.payload.streak,
        lastLoginDate: action.payload.loginDate,
      };

    case 'STREAK_OPTIMISTIC':
      return {
        ...state,
        dailyStreak: action.payload.streak,
        lastLoginDate: action.payload.loginDate,
      };

    case 'STREAK_REVERT':
      return {
        ...state,
        dailyStreak: action.payload.streak,
        lastLoginDate: action.payload.loginDate,
      };

    case 'CHALLENGE_PROGRESS':
      return {
        ...state,
        challenges: state.challenges.map((c) =>
          c.id === action.payload.challengeId
            ? { ...c, progress: action.payload.progress, completed: action.payload.progress >= c.target }
            : c
        ),
      };

    case 'CHALLENGE_COMPLETED_OPTIMISTIC':
      return {
        ...state,
        challenges: state.challenges.map((c) =>
          c.id === action.payload ? { ...c, completed: true, progress: c.target } : c
        ),
      };

    case 'GAMIFICATION_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'CLEAR_GAMIFICATION':
      return { ...initialState, featureFlags: state.featureFlags };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

// Context
interface GamificationContextType {
  state: GamificationState;
  actions: {
    loadGamificationData: (forceRefresh?: boolean) => Promise<void>;
    syncCoinsFromWallet: () => Promise<void>;
    triggerAchievementCheck: (eventType: string, data?: any) => Promise<Achievement[]>;
    awardCoins: (amount: number, reason: string) => Promise<void>;
    spendCoins: (amount: number, reason: string) => Promise<void>;
    updateDailyStreak: () => Promise<void>;
    claimReward: (rewardId: string) => Promise<{ success: boolean; reward?: any; points?: number }>;
    completeChallenge: (challengeId: string) => Promise<{ success: boolean; reward?: number }>;
    markAchievementAsShown: (achievementId: string) => void;
    refreshAchievements: () => Promise<void>;
    clearError: () => void;
  };
  computed: {
    unlockedCount: number;
    completionPercentage: number;
    pendingAchievements: AchievementUnlock[];
    hasUnshownAchievements: boolean;
    canEarnCoins: boolean;
  };
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

// Provider
interface GamificationProviderProps {
  children: ReactNode;
}

// ── Module-level dedup: survives component remounts caused by DeferredProviders ──
let _gamificationInitialized = false;
let _gamificationPending: Promise<void> | null = null;
let _dailyCheckInSessionAttempted = false;

export function GamificationProvider({ children }: GamificationProviderProps) {
  const [state, dispatch] = useReducer(gamificationReducer, initialState);
  const isAuthenticated = useIsAuthenticated();
  const isOnboarded = useIsOnboarded();
  const { availableBalance, refreshWallet: refreshSharedWallet } = useWalletContext();

  // CRITICAL: Queue for coin operations to prevent race conditions
  const coinOperationQueue = useRef<Array<() => Promise<void>>>([]);
  const isProcessingCoins = useRef(false);

  // CRITICAL: Prevent duplicate API calls on mount/re-render (module-level survives remounts)
  const hasInitializedRef = useRef(_gamificationInitialized);
  const isLoadingDataRef = useRef(false);
  // Note: recalculateAchievements cooldown is now handled at the API layer
  // (achievementApi.ts) so ALL callers are protected globally.

  // Helper Functions - Define before useEffects
  // Check cache validity
  const isCacheValid = useCallback(async (): Promise<boolean> => {
    try {
      const cacheTime = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_TIME);
      if (!cacheTime) return false;

      const timeDiff = Date.now() - parseInt(cacheTime, 10);
      return timeDiff < CACHE_DURATION;
    } catch {
      return false;
    }
  }, []);

  // Ref captures latest state for cache save — avoids circular dependency
  // (saveToCache depending on state → new identity → triggers cache effect → repeat)
  const stateForCacheRef = useRef(state);
  stateForCacheRef.current = state;

  // Save to cache — stable identity via ref
  const saveToCache = useCallback(async () => {
    const s = stateForCacheRef.current;
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(s.achievements || [])],
        [STORAGE_KEYS.COINS, JSON.stringify(s.coinBalance || { total: 0 })],
        [STORAGE_KEYS.CHALLENGES, JSON.stringify(s.challenges || [])],
        [STORAGE_KEYS.STREAK, (s.dailyStreak ?? 0).toString()],
        [STORAGE_KEYS.LAST_LOGIN, s.lastLoginDate || ''],
        [STORAGE_KEYS.CACHE_TIME, Date.now().toString()],
      ]);
    } catch (error) {
      // silently handle
    }
  }, []); // Empty deps — reads from ref

  // CRITICAL: Queue processing function for atomic coin operations
  const processCoinQueue = useCallback(async () => {
    if (isProcessingCoins.current) return;
    isProcessingCoins.current = true;

    while (coinOperationQueue.current.length > 0) {
      const operation = coinOperationQueue.current.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          // silently handle
        }
      }
    }

    isProcessingCoins.current = false;
  }, []);

  const queueCoinOperation = useCallback((operation: () => Promise<void>): Promise<void> => {
    return new Promise((resolve, reject) => {
      coinOperationQueue.current.push(async () => {
        try {
          await operation();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      if (!isProcessingCoins.current) {
        processCoinQueue();
      }
    });
  }, [processCoinQueue]);

  // Sync coins from wallet via shared WalletContext (SINGLE SOURCE OF TRUTH)
  // FIX: availableBalance is in deps to prevent stale closure — callback re-creates
  // when wallet balance changes so we always read the latest value
  const syncCoinsFromWallet = useCallback(async (forceRefresh = false) => {
    try {
      // Only refresh wallet if forced — WalletContext already fetches on mount
      // Checking availableBalance === 0 caused duplicate calls since wallet may still be loading
      if (forceRefresh) {
        await refreshSharedWallet();
      }

      // Update gamification coin balance from shared context
      // Note: availableBalance comes from the WalletContext closure
      const coinBalance: CoinBalance = {
        total: availableBalance,
        earned: 0,
        spent: 0,
        pending: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
      };

      dispatch({ type: 'COINS_LOADED', payload: coinBalance });
    } catch (error) {
      // silently handle
    }
  }, [refreshSharedWallet, availableBalance]);

  // Load gamification data
  const loadGamificationData = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated) {

      return;
    }

    try {
      dispatch({ type: 'GAMIFICATION_LOADING', payload: true });

      // Try cache first (unless force refresh) — single batched read
      if (!forceRefresh) {
        try {
          const cachedData = await AsyncStorage.multiGet([
            STORAGE_KEYS.CACHE_TIME,
            STORAGE_KEYS.ACHIEVEMENTS,
          ]);
          const cacheTime = cachedData[0][1];
          const achievementsData = cachedData[1][1];

          if (cacheTime && achievementsData) {
            const timeDiff = Date.now() - parseInt(cacheTime, 10);
            if (timeDiff < CACHE_DURATION) {
              // Sync coins from wallet in background (non-blocking)
              syncCoinsFromWallet().catch((err) => {
          console.error('[GamificationContext] Error:', err);
        });
              dispatch({ type: 'GAMIFICATION_LOADING', payload: false });
              return;
            }
          }
        } catch {
          // Cache read failed, continue to fresh fetch
        }
      }

      // Fetch fresh data — all API calls in parallel
      {
        const fetches: Promise<void>[] = [];

        if (state.featureFlags.ENABLE_ACHIEVEMENTS) {
          fetches.push(
            achievementApi.getAchievementProgress().then(progressResponse => {
              if (progressResponse.data) {
                dispatch({
                  type: 'ACHIEVEMENTS_LOADED',
                  payload: {
                    achievements: progressResponse.data.achievements,
                    progress: progressResponse.data,
                  },
                });
              }
            }).catch((err) => {
        console.error('[GamificationContext] Error:', err);
      })
          );
        }

        if (state.featureFlags.ENABLE_COINS) {
          fetches.push(syncCoinsFromWallet().catch((err) => {
          console.error('[GamificationContext] Error:', err);
        }));
        }

        if (state.featureFlags.ENABLE_CHALLENGES) {
          fetches.push(
            challengesApi.getMyProgress().then(challengesResponse => {
              if (challengesResponse.success && challengesResponse.data) {
                const mappedChallenges: Challenge[] = challengesResponse.data.map((cp) => ({
                  id: cp.challenge._id,
                  title: cp.challenge.title,
                  description: cp.challenge.description,
                  type: cp.challenge.type,
                  progress: cp.progress,
                  target: cp.target,
                  reward: cp.challenge.rewards.coins,
                  expiresAt: cp.challenge.endDate,
                  completed: cp.completed,
                }));
                dispatch({ type: 'CHALLENGES_LOADED', payload: mappedChallenges });
              }
            }).catch((err) => {
        console.error('[GamificationContext] Error:', err);
      })
          );
        }

        await Promise.all(fetches);
      }

      dispatch({ type: 'GAMIFICATION_LOADING', payload: false });
    } catch (error) {
      dispatch({
        type: 'GAMIFICATION_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load gamification data',
      });
    }
  }, [isAuthenticated, state.featureFlags.ENABLE_ACHIEVEMENTS, state.featureFlags.ENABLE_COINS, state.featureFlags.ENABLE_CHALLENGES]);

  // Trigger achievement check — cooldown/dedup is handled by achievementApi.recalculateAchievements()
  const triggerAchievementCheck = useCallback(async (eventType: string, data?: any): Promise<Achievement[]> => {
    if (!state.featureFlags.ENABLE_ACHIEVEMENTS) return [];

    try {
      const response = await achievementApi.recalculateAchievements();

      if (response.data) {
        // Find newly unlocked achievements
        const newlyUnlocked = response.data.filter(
          (achievement) =>
            achievement.unlocked &&
            !state.achievements.find((a) => a.id === achievement.id && a.unlocked)
        );

        // Dispatch each newly unlocked achievement
        newlyUnlocked.forEach((achievement) => {
          dispatch({ type: 'ACHIEVEMENT_UNLOCKED', payload: achievement });
        });

        // Refresh achievements list
        const progressResponse = await achievementApi.getAchievementProgress();
        if (progressResponse.data) {
          dispatch({
            type: 'ACHIEVEMENTS_LOADED',
            payload: {
              achievements: progressResponse.data.achievements,
              progress: progressResponse.data,
            },
          });
        }

        return newlyUnlocked;
      }

      return [];
    } catch (error) {
      return [];
    }
  }, [state.featureFlags.ENABLE_ACHIEVEMENTS, state.achievements]);

  // ✅ UPDATED: Award coins via operation queue (prevents race conditions)
  const awardCoins = useCallback(async (amount: number, reason: string) => {
    if (!state.featureFlags.ENABLE_COINS) return;

    return queueCoinOperation(async () => {
      try {
        // Use coin sync service to award coins (syncs to wallet automatically)
        const syncResult = await coinSyncService.syncGamificationReward(
          amount,
          'bonus',
          { reason, timestamp: new Date().toISOString() }
        );

        if (syncResult.success) {
          // Update local state
          dispatch({ type: 'COINS_EARNED', payload: amount });

          // Refresh from wallet (single source of truth)
          await syncCoinsFromWallet();

          // Also check for coin-related achievements
          await triggerAchievementCheck('COINS_EARNED', { amount, reason });
        } else {
          throw new Error(syncResult.error || 'Failed to sync coins to wallet');
        }
      } catch (error) {
        throw error;
      }
    });
  }, [state.featureFlags.ENABLE_COINS, queueCoinOperation, syncCoinsFromWallet, triggerAchievementCheck]);

  // ✅ UPDATED: Spend coins via operation queue (prevents race conditions)
  const spendCoins = useCallback(async (amount: number, reason: string) => {
    if (!state.featureFlags.ENABLE_COINS) return;

    return queueCoinOperation(async () => {
      try {
        if (state.coinBalance.total < amount) {
          throw new Error('Insufficient coin balance');
        }

        // Use coin sync service to spend coins (syncs to wallet automatically)
        const syncResult = await coinSyncService.spendCoins(amount, reason, {
          timestamp: new Date().toISOString(),
        });

        if (syncResult.success) {
          // Update local state
          dispatch({ type: 'COINS_SPENT', payload: amount });

          // Refresh from wallet (single source of truth)
          await syncCoinsFromWallet();
        } else {
          throw new Error(syncResult.error || 'Failed to sync coin spending to wallet');
        }
      } catch (error) {
        throw error;
      }
    });
  }, [state.featureFlags.ENABLE_COINS, state.coinBalance.total, queueCoinOperation, syncCoinsFromWallet]);

  // Update daily streak
  const updateDailyStreak = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = state.lastLoginDate?.split('T')[0];

      if (lastLogin === today || _dailyCheckInSessionAttempted) {
        // Already logged in today, or check-in already attempted this session
        return;
      }

      // Check daily check-in status from API
      try {
        const checkInStatusResponse = await pointsApi.getDailyCheckIn();

        if (checkInStatusResponse.success && checkInStatusResponse.data?.canCheckIn) {
          _dailyCheckInSessionAttempted = true;

          // Optimistic update: increment streak immediately
          const optimisticStreak = (state.dailyStreak || 0) + 1;
          const optimisticDate = new Date().toISOString();
          dispatch({
            type: 'STREAK_OPTIMISTIC',
            payload: { streak: optimisticStreak, loginDate: optimisticDate },
          });

          // Perform daily check-in
          const checkInResponse = await pointsApi.performDailyCheckIn();

          if (checkInResponse.success && checkInResponse.data) {
            const { pointsEarned, streak } = checkInResponse.data;

            dispatch({
              type: 'STREAK_UPDATED',
              payload: { streak, loginDate: new Date().toISOString() },
            });

            // ✅ UPDATED: Update coin balance from wallet (single source of truth)
            await syncCoinsFromWallet();

            // Check for streak achievements
            await triggerAchievementCheck('DAILY_LOGIN', { streak, pointsEarned });

          } else {
            // Revert optimistic update on failure
            dispatch({
              type: 'STREAK_REVERT',
              payload: { streak: state.dailyStreak, loginDate: state.lastLoginDate },
            });
          }
        } else if (checkInStatusResponse.data) {
          // Already checked in, just update local state
          dispatch({
            type: 'STREAK_UPDATED',
            payload: {
              streak: checkInStatusResponse.data.currentStreak,
              loginDate: checkInStatusResponse.data.lastCheckInDate || new Date().toISOString(),
            },
          });
        }
      } catch (checkInError) {
        // Revert optimistic update on error
        dispatch({
          type: 'STREAK_REVERT',
          payload: { streak: state.dailyStreak, loginDate: state.lastLoginDate },
        });
        // silently handle - check-in endpoint may not exist yet
      }
    } catch (error) {
      // silently handle
    }
  }, [state.lastLoginDate, state.dailyStreak, triggerAchievementCheck]);

  // Mark achievement as shown
  const markAchievementAsShown = useCallback((achievementId: string) => {
    dispatch({ type: 'ACHIEVEMENT_SHOWN', payload: achievementId });
  }, []);

  // Claim reward with optimistic update
  const claimReward = useCallback(async (progressId: string): Promise<{ success: boolean; reward?: any; points?: number }> => {
    const prevChallenges = [...state.challenges];
    const challenge = state.challenges.find((c) => c.id === progressId);

    // Optimistic update: mark challenge as completed immediately
    dispatch({ type: 'CHALLENGE_COMPLETED_OPTIMISTIC', payload: progressId });

    try {
      const response = await challengesApi.claimReward(progressId);

      if (response.success && response.data) {
        // Update coin balance from wallet (single source of truth)
        await syncCoinsFromWallet();

        // Check for challenge completion achievements
        await triggerAchievementCheck('CHALLENGE_COMPLETED', { challengeId: progressId });

        return { success: true, reward: response.data, points: response.data.coinsEarned };
      } else {
        // Revert optimistic update on failure
        dispatch({ type: 'CHALLENGES_LOADED', payload: prevChallenges });
        useToastStore.getState().show('Failed to claim reward', 'error');
        return { success: false };
      }
    } catch (error) {
      // Revert optimistic update on error
      dispatch({ type: 'CHALLENGES_LOADED', payload: prevChallenges });
      useToastStore.getState().show('Failed to claim reward', 'error');
      return { success: false };
    }
  }, [state.challenges, syncCoinsFromWallet, triggerAchievementCheck]);

  // Complete challenge with optimistic update (alias for claimReward)
  const completeChallenge = useCallback(async (challengeId: string): Promise<{ success: boolean; reward?: number }> => {
    // For challenges, we use the progressId which is the same as challengeId in the local state
    // The challenge progress ID from my-progress endpoint is stored as challenge.id in local state
    return claimReward(challengeId);
  }, [claimReward]);

  // Refresh achievements
  const refreshAchievements = useCallback(async () => {
    await loadGamificationData(true);
  }, [loadGamificationData]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Effects - Run after function definitions
  // Load gamification data on mount and when auth changes
  // Skip during onboarding to prevent thundering herd of API calls on Android
  useEffect(() => {
    if (isAuthenticated && isOnboarded) {
      // Prevent duplicate calls during rapid re-renders
      if (isLoadingDataRef.current) return;
      // Only initialize once per session
      if (hasInitializedRef.current) return;

      isLoadingDataRef.current = true;
      hasInitializedRef.current = true;
      _gamificationInitialized = true; // Module-level — survives remounts

      Promise.all([
        loadGamificationData(),
        updateDailyStreak()
      ]).catch((err) => {
          console.error('[GamificationContext] Error:', err);
        }).finally(() => {
        isLoadingDataRef.current = false;
      });
    } else if (!isAuthenticated) {
      dispatch({ type: 'CLEAR_GAMIFICATION' });
      hasInitializedRef.current = false; // Reset on logout
      _gamificationInitialized = false;
      _dailyCheckInSessionAttempted = false;
    }
  }, [isAuthenticated, isOnboarded]); // Remove callback dependencies to prevent loop

  // Save data to cache (debounced — avoids writing on every state micro-change)
  const saveToCacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isAuthenticated && isOnboarded) {
      if (saveToCacheTimerRef.current) clearTimeout(saveToCacheTimerRef.current);
      saveToCacheTimerRef.current = setTimeout(() => saveToCache(), 2000);
    }
    return () => {
      if (saveToCacheTimerRef.current) clearTimeout(saveToCacheTimerRef.current);
    };
  }, [isAuthenticated, isOnboarded]); // saveToCache has stable identity (empty deps, reads from ref)

  // Computed values — memoized on specific state slices (not entire state object)
  const computed = useMemo(() => {
    const unlockedCount = state.achievementProgress?.summary.unlocked || 0;
    const completionPercentage = state.achievementProgress?.summary.completionPercentage || 0;
    const pendingAchievements = state.achievementQueue.filter((item) => !item.shown);
    const hasUnshownAchievements = pendingAchievements.length > 0;
    const canEarnCoins = state.featureFlags.ENABLE_COINS;
    return { unlockedCount, completionPercentage, pendingAchievements, hasUnshownAchievements, canEarnCoins };
  }, [state.achievementProgress?.summary, state.achievementQueue, state.featureFlags.ENABLE_COINS]);

  // Stable actions ref — callbacks change identity on re-render but their behavior
  // is always "latest". Using a ref avoids invalidating the context memo on every render.
  const actionsRef = useRef({
    loadGamificationData,
    syncCoinsFromWallet,
    triggerAchievementCheck,
    awardCoins,
    spendCoins,
    updateDailyStreak,
    claimReward,
    completeChallenge,
    markAchievementAsShown,
    refreshAchievements,
    clearError,
  });
  actionsRef.current = {
    loadGamificationData,
    syncCoinsFromWallet,
    triggerAchievementCheck,
    awardCoins,
    spendCoins,
    updateDailyStreak,
    claimReward,
    completeChallenge,
    markAchievementAsShown,
    refreshAchievements,
    clearError,
  };

  // Stable wrapper that delegates to latest callbacks via ref
  const stableActions = useMemo(() => ({
    loadGamificationData: (...args: Parameters<typeof loadGamificationData>) => actionsRef.current.loadGamificationData(...args),
    syncCoinsFromWallet: () => actionsRef.current.syncCoinsFromWallet(),
    triggerAchievementCheck: (...args: Parameters<typeof triggerAchievementCheck>) => actionsRef.current.triggerAchievementCheck(...args),
    awardCoins: (...args: Parameters<typeof awardCoins>) => actionsRef.current.awardCoins(...args),
    spendCoins: (...args: Parameters<typeof spendCoins>) => actionsRef.current.spendCoins(...args),
    updateDailyStreak: () => actionsRef.current.updateDailyStreak(),
    claimReward: (...args: Parameters<typeof claimReward>) => actionsRef.current.claimReward(...args),
    completeChallenge: (...args: Parameters<typeof completeChallenge>) => actionsRef.current.completeChallenge(...args),
    markAchievementAsShown: (id: string) => actionsRef.current.markAchievementAsShown(id),
    refreshAchievements: () => actionsRef.current.refreshAchievements(),
    clearError: () => actionsRef.current.clearError(),
  }), []); // Empty deps — wrapper identity never changes

  // Memoize context value — only re-renders consumers when state or computed values change
  const contextValue: GamificationContextType = useMemo(() => ({
    state,
    actions: stableActions,
    computed,
  }), [state, stableActions, computed]);

  // Sync to Zustand store for crash-safe fallback (useEffect — never setState during render)
  // FIX: Use a ref to track the last synced context to prevent infinite loops.
  // Previously, whenever state changed, contextValue changed, triggering this effect,
  // which updated Zustand, which caused re-renders, which changed state again → infinite loop.
  const _setFromProvider = useGamificationStore((s) => s._setFromProvider);
  const lastSyncedContextRef = useRef<string | null>(null);
  useEffect(() => {
    const contextKey = JSON.stringify({
      achievementsLen: contextValue.state.achievements.length,
      coinBalance: contextValue.state.coinBalance.total,
      challengesLen: contextValue.state.challenges.length,
      dailyStreak: contextValue.state.dailyStreak,
    });
    // Only sync if the data actually changed (not just object reference)
    if (contextKey !== lastSyncedContextRef.current) {
      lastSyncedContextRef.current = contextKey;
      _setFromProvider(contextValue);
    }
  }, [contextValue, _setFromProvider]);

  return (
    <GamificationContext.Provider value={contextValue}>
      {children}
    </GamificationContext.Provider>
  );
}

// Hook
// Safe defaults when provider hasn't loaded yet (deferred loading)
const GAMIFICATION_DEFAULTS: GamificationContextType = {
  state: {
    achievements: [],
    achievementProgress: null,
    coinBalance: { total: 0, earned: 0, spent: 0, pending: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
    challenges: [],
    achievementQueue: [],
    dailyStreak: 0,
    lastLoginDate: null,
    isLoading: false,
    error: null,
    featureFlags: GAMIFICATION_FLAGS,
  },
  actions: {
    loadGamificationData: async () => {},
    syncCoinsFromWallet: async () => {},
    triggerAchievementCheck: async () => [],
    awardCoins: async () => {},
    spendCoins: async () => {},
    updateDailyStreak: async () => {},
    claimReward: async () => ({ success: false }),
    completeChallenge: async () => ({ success: false }),
    markAchievementAsShown: () => {},
    refreshAchievements: async () => {},
    clearError: () => {},
  },
  computed: {
    unlockedCount: 0,
    completionPercentage: 0,
    pendingAchievements: [],
    hasUnshownAchievements: false,
    canEarnCoins: false,
  },
};

// Hook — falls back to Zustand store for crash safety when outside Provider
export function useGamification() {
  const context = useContext(GamificationContext);
  const storeState = useGamificationStore((s) => s.state);
  const storeActions = useGamificationStore((s) => s.actions);
  const storeComputed = useGamificationStore((s) => s.computed);

  if (context !== undefined) {
    return context;
  }

  // Fallback to Zustand store (populated by Provider elsewhere in the tree)
  return { state: storeState, actions: storeActions, computed: storeComputed };
}

export { GamificationContext };
export type { GamificationState, GamificationContextType };

// Test helper: reset module-level state between tests
export function __resetModuleState() {
  _gamificationInitialized = false;
  _gamificationPending = null;
}
