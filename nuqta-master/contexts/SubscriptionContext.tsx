// @ts-nocheck
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import subscriptionApi from '@/services/subscriptionApi';
import type { CurrentSubscription, SubscriptionTier } from '@/services/subscriptionApi';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';

// Feature flags for gradual rollout
const FEATURE_FLAGS = {
  ENABLE_SUBSCRIPTIONS: true,
  ENABLE_TIER_BENEFITS: true,
  ENABLE_CASHBACK_MULTIPLIER: true,
  ENABLE_FREE_DELIVERY: true,
};

// Types
interface SubscriptionState {
  currentSubscription: CurrentSubscription | null;
  availableTiers: SubscriptionTier[];
  isLoading: boolean;
  error: string | null;
  lastFetched: string | null;
  featureFlags: typeof FEATURE_FLAGS;
}

type SubscriptionAction =
  | { type: 'SUBSCRIPTION_LOADING'; payload: boolean }
  | { type: 'SUBSCRIPTION_LOADED'; payload: { subscription: CurrentSubscription; tiers: SubscriptionTier[] } }
  | { type: 'SUBSCRIPTION_ERROR'; payload: string }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: CurrentSubscription }
  | { type: 'CLEAR_SUBSCRIPTION' }
  | { type: 'CLEAR_ERROR' };

// BUG FIX #3: Storage keys - userId will be appended at runtime to prevent cross-user contamination
const getStorageKeys = (userId: string) => ({
  SUBSCRIPTION_DATA: `subscription_data_${userId}`,
  SUBSCRIPTION_CACHE_TIME: `subscription_cache_time_${userId}`,
});

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Initial state
const initialState: SubscriptionState = {
  currentSubscription: null,
  availableTiers: [],
  isLoading: false,
  error: null,
  lastFetched: null,
  featureFlags: FEATURE_FLAGS,
};

// Reducer
function subscriptionReducer(state: SubscriptionState, action: SubscriptionAction): SubscriptionState {
  switch (action.type) {
    case 'SUBSCRIPTION_LOADING':
      return { ...state, isLoading: action.payload, error: null };

    case 'SUBSCRIPTION_LOADED':
      return {
        ...state,
        currentSubscription: action.payload.subscription,
        availableTiers: action.payload.tiers,
        isLoading: false,
        error: null,
        lastFetched: new Date().toISOString(),
      };

    case 'SUBSCRIPTION_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'UPDATE_SUBSCRIPTION':
      return {
        ...state,
        currentSubscription: action.payload,
        lastFetched: new Date().toISOString(),
      };

    case 'CLEAR_SUBSCRIPTION':
      return { ...initialState, featureFlags: state.featureFlags };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

// Context
interface SubscriptionContextType {
  state: SubscriptionState;
  actions: {
    loadSubscription: (forceRefresh?: boolean) => Promise<void>;
    refreshSubscription: () => Promise<void>;
    clearError: () => void;
  };
  computed: {
    isSubscribed: boolean;
    isPremium: boolean;
    isVIP: boolean;
    cashbackMultiplier: number;
    hasFreeDelivery: boolean;
    daysRemaining: number;
    canApplyBenefit: (benefit: string) => boolean;
  };
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// ── Module-level dedup: survives component remounts caused by DeferredProviders ──
let _subscriptionLoaded = false;

// Provider
interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);
  const authUser = useAuthUser();
  const isAuthenticated = useIsAuthenticated();

  // BUG FIX #5: Added proper dependencies to useEffect
  // Skip during onboarding to prevent thundering herd of API calls on Android
  useEffect(() => {
    if (isAuthenticated && authUser?.isOnboarded && state.featureFlags.ENABLE_SUBSCRIPTIONS) {
      // Module-level dedup: prevent re-fetching on DeferredProvider remounts
      if (!_subscriptionLoaded) {
        _subscriptionLoaded = true;
        loadSubscription();
      }
    } else if (!isAuthenticated) {
      // Clear subscription data when user logs out
      dispatch({ type: 'CLEAR_SUBSCRIPTION' });
      _subscriptionLoaded = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authUser?.id, authUser?.isOnboarded]);

  // BUG FIX #3: Include userId in cache key to prevent cross-user contamination
  const isCacheValid = useCallback(async (): Promise<boolean> => {
    try {
      const userId = authUser?.id;
      if (!userId) return false;

      const STORAGE_KEYS = getStorageKeys(userId);
      const cacheTime = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_CACHE_TIME);
      if (!cacheTime) return false;

      const timeDiff = Date.now() - parseInt(cacheTime, 10);
      return timeDiff < CACHE_DURATION;
    } catch {
      return false;
    }
  }, [authUser?.id]);

  // Load subscription data
  const loadSubscription = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated || !state.featureFlags.ENABLE_SUBSCRIPTIONS) {
      return;
    }

    // BUG FIX #3: Get userId and user-specific storage keys
    const userId = authUser?.id;
    if (!userId) {
      return;
    }

    // Check token availability (DeferredProviders staggering ensures token is set by now)
    const apiClient = require('@/services/apiClient').default;
    if (!apiClient.getAuthToken()) {
      return;
    }

    const STORAGE_KEYS = getStorageKeys(userId);

    try {
      dispatch({ type: 'SUBSCRIPTION_LOADING', payload: true });

      // Check cache first (unless force refresh) — single batched read
      if (!forceRefresh) {
        try {
          const cached = await AsyncStorage.multiGet([
            STORAGE_KEYS.SUBSCRIPTION_CACHE_TIME,
            STORAGE_KEYS.SUBSCRIPTION_DATA,
          ]);
          const cacheTime = cached[0][1];
          const cachedData = cached[1][1];

          if (cacheTime && cachedData) {
            const timeDiff = Date.now() - parseInt(cacheTime, 10);
            if (timeDiff < CACHE_DURATION) {
              const { subscription, tiers } = JSON.parse(cachedData);
              dispatch({ type: 'SUBSCRIPTION_LOADED', payload: { subscription, tiers } });
              return;
            }
          }
        } catch {
          // Cache read failed, continue to fresh fetch
        }
      }

      // BUG FIX #2: Use Promise.allSettled to prevent complete failure if one API fails
      const results = await Promise.allSettled([
        subscriptionApi.getCurrentSubscription(),
        subscriptionApi.getAvailableTiers(),
      ]);

      // Extract results safely
      const subscription = results[0].status === 'fulfilled'
        ? results[0].value
        : null;
      const tiers = results[1].status === 'fulfilled'
        ? results[1].value
        : [];

      // If subscription fetch failed, use default free tier (graceful degradation)
      if (!subscription) {
        const freeTierDefault: CurrentSubscription = {
          _id: 'free-default',
          user: authUser?.id || '',
          tier: 'free',
          status: 'active',
          billingCycle: 'monthly',
          price: 0,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          autoRenew: false,
          benefits: {
            cashbackMultiplier: 1,
            freeDelivery: false,
            prioritySupport: false,
            exclusiveDeals: false,
          },
          usage: {
            totalSavings: 0,
            ordersThisMonth: 0,
            ordersAllTime: 0,
            cashbackEarned: 0,
            deliveryFeesSaved: 0,
            exclusiveDealsUsed: 0,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        dispatch({ type: 'SUBSCRIPTION_LOADED', payload: { subscription: freeTierDefault, tiers } });
        dispatch({ type: 'SUBSCRIPTION_LOADING', payload: false });
        return;
      }

      // Cache the data
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.SUBSCRIPTION_DATA, JSON.stringify({ subscription, tiers })],
        [STORAGE_KEYS.SUBSCRIPTION_CACHE_TIME, Date.now().toString()],
      ]);

      dispatch({ type: 'SUBSCRIPTION_LOADED', payload: { subscription, tiers } });
    } catch (error) {
      // Graceful degradation - set free tier as default
      const freeTierDefault: CurrentSubscription = {
        _id: 'free-default',
        user: authUser?.id || '',
        tier: 'free',
        status: 'active',
        billingCycle: 'monthly',
        price: 0,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: false,
        benefits: {
          cashbackMultiplier: 1,
          freeDelivery: false,
          prioritySupport: false,
          exclusiveDeals: false,
        },
        usage: {
          totalSavings: 0,
          ordersThisMonth: 0,
          ordersAllTime: 0,
          cashbackEarned: 0,
          deliveryFeesSaved: 0,
          exclusiveDealsUsed: 0,
        },
        daysRemaining: 365,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dispatch({
        type: 'SUBSCRIPTION_LOADED',
        payload: {
          subscription: freeTierDefault,
          tiers: [],
        },
      });

      dispatch({
        type: 'SUBSCRIPTION_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load subscription',
      });
    }
  }, [isAuthenticated, authUser?.id, state.featureFlags.ENABLE_SUBSCRIPTIONS]);

  // Refresh subscription
  const refreshSubscription = useCallback(async () => {
    await loadSubscription(true);
  }, [loadSubscription]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Computed values
  // BUG FIX #6: Include 'trial' and 'grace_period' status as valid active states
  const activeStatuses = ['active', 'trial', 'grace_period'];
  const isSubscribed = state.currentSubscription?.tier !== 'free' && activeStatuses.includes(state.currentSubscription?.status || '');
  const isPremium = state.currentSubscription?.tier === 'premium' && activeStatuses.includes(state.currentSubscription?.status || '');
  const isVIP = state.currentSubscription?.tier === 'vip' && activeStatuses.includes(state.currentSubscription?.status || '');

  const cashbackMultiplier = state.featureFlags.ENABLE_CASHBACK_MULTIPLIER
    ? state.currentSubscription?.benefits?.cashbackMultiplier || 1
    : 1;

  const hasFreeDelivery = state.featureFlags.ENABLE_FREE_DELIVERY
    ? state.currentSubscription?.benefits?.freeDelivery || false
    : false;

  const daysRemaining = state.currentSubscription?.daysRemaining || 0;

  const canApplyBenefit = useCallback((benefit: string): boolean => {
    if (!state.featureFlags.ENABLE_TIER_BENEFITS) return false;
    if (!state.currentSubscription) return false;

    const benefits = state.currentSubscription.benefits;
    return benefits?.[benefit] === true;
  }, [state.featureFlags.ENABLE_TIER_BENEFITS, state.currentSubscription]);

  const contextValue: SubscriptionContextType = useMemo(() => ({
    state,
    actions: {
      loadSubscription,
      refreshSubscription,
      clearError,
    },
    computed: {
      isSubscribed,
      isPremium,
      isVIP,
      cashbackMultiplier,
      hasFreeDelivery,
      daysRemaining,
      canApplyBenefit,
    },
  }), [state, loadSubscription, refreshSubscription, clearError, isSubscribed, isPremium, isVIP, cashbackMultiplier, hasFreeDelivery, daysRemaining, canApplyBenefit]);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}

const SUBSCRIPTION_DEFAULTS: SubscriptionContextType = {
  state: initialState,
  actions: {
    loadSubscription: async () => {},
    refreshSubscription: async () => {},
    clearError: () => {},
  },
  computed: {
    isSubscribed: false,
    isPremium: false,
    isVIP: false,
    cashbackMultiplier: 1,
    hasFreeDelivery: false,
    daysRemaining: 0,
    canApplyBenefit: () => false,
  },
};

// Lazy import to avoid circular deps
let __useSubscriptionStore: () => any;
try {
  const { useSubscriptionStore } = require('@/stores/subscriptionStore');
  __useSubscriptionStore = useSubscriptionStore;
} catch {
  __useSubscriptionStore = () => SUBSCRIPTION_DEFAULTS;
}

// Hook
// Now backed by Zustand store -- works with or without SubscriptionProvider in tree.
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  const store = __useSubscriptionStore();
  if (context) return context;
  return store as unknown as SubscriptionContextType;
}

export { SubscriptionContext };
export type { SubscriptionState, SubscriptionContextType };
