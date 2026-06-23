/**
 * PriveContext
 *
 * Centralized Prive state shared across the app.
 * Follows the same useReducer + stale-while-revalidate pattern as WalletContext.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import { useWalletContext } from './WalletContext';
import { usePriveStore } from '@/stores/priveStore';
import priveApi, {
  PriveDashboard,
  PriveEligibility,
  PriveOffer,
  Highlights,
  DailyProgress,
} from '@/services/priveApi';
import apiClient from '@/services/apiClient';

// ---------------------------------------------------------------------------
// Program config type (from GET /prive/program-config/public)
// ---------------------------------------------------------------------------
interface ProgramConfig {
  featureFlags: Record<string, boolean>;
  tiers: Array<{
    id: string;
    name: string;
    threshold: number;
    benefits?: string[];
  }>;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
interface PriveState {
  dashboard: PriveDashboard | null;
  eligibility: PriveEligibility | null;
  programConfig: ProgramConfig | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchedAt: number;
}

const initialState: PriveState = {
  dashboard: null,
  eligibility: null,
  programConfig: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastFetchedAt: 0,
};

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------
type PriveAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_DASHBOARD'; payload: PriveDashboard }
  | { type: 'SET_ELIGIBILITY'; payload: PriveEligibility }
  | { type: 'SET_PROGRAM_CONFIG'; payload: ProgramConfig }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

function priveReducer(state: PriveState, action: PriveAction): PriveState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_REFRESHING':
      return { ...state, isRefreshing: action.payload };
    case 'SET_DASHBOARD':
      return {
        ...state,
        dashboard: action.payload,
        error: null,
        lastFetchedAt: Date.now(),
      };
    case 'SET_ELIGIBILITY':
      return { ...state, eligibility: action.payload, error: null };
    case 'SET_PROGRAM_CONFIG':
      return { ...state, programConfig: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Stale threshold (30 seconds)
// ---------------------------------------------------------------------------
const STALE_THRESHOLD_MS = 30_000;

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------
interface PriveContextType {
  // Raw state
  dashboard: PriveDashboard | null;
  eligibility: PriveEligibility | null;
  programConfig: ProgramConfig | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchedAt: number;

  // Derived values
  tier: string;
  hasAccess: boolean;
  featuredOffers: PriveOffer[];
  highlights: Highlights | null;
  dailyProgress: DailyProgress | null;
  isFeatureEnabled: (flag: string) => boolean;

  // Actions
  refreshAll: () => Promise<void>;
  refreshEligibility: () => Promise<void>;
  checkIn: () => Promise<void>;
  trackOfferClick: (offerId: string) => void;
}

const PriveContext = createContext<PriveContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function PriveProvider({ children }: { children: ReactNode }) {
  const authUser = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const { refreshWallet } = useWalletContext();

  const [state, dispatch] = useReducer(priveReducer, initialState);
  const pendingRef = useRef<Promise<void> | null>(null);
  const hasFetchedRef = useRef(false);

  // ── Fetch helpers ────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await priveApi.getDashboard();
      if (response.success && response.data) {
        dispatch({ type: 'SET_DASHBOARD', payload: response.data });
      }
    } catch (err) {
      throw err;
    }
  }, []);

  const fetchEligibility = useCallback(async () => {
    try {
      const response = await priveApi.getEligibility();
      if (response.success && response.data) {
        dispatch({ type: 'SET_ELIGIBILITY', payload: response.data });
      }
    } catch (err) {
      throw err;
    }
  }, []);

  const fetchProgramConfig = useCallback(async () => {
    try {
      const response = await apiClient.get<ProgramConfig>('/prive/program-config/public');
      if (response.success && response.data) {
        dispatch({ type: 'SET_PROGRAM_CONFIG', payload: response.data });
      }
    } catch (err) {
      // Non-critical — don't throw
    }
  }, []);

  // ── refreshAll (stale-while-revalidate) ──────────────────────────────────

  const refreshAll = useCallback(async () => {
    // Deduplicate: if already in-flight, await that promise
    if (pendingRef.current) {
      await pendingRef.current;
      return;
    }

    const isStale = Date.now() - state.lastFetchedAt > STALE_THRESHOLD_MS;
    const isFirstLoad = state.dashboard === null;

    // If data is fresh and not first load, skip
    if (!isStale && !isFirstLoad) return;

    const promise = (async () => {
      try {
        // Show loading only on first load; refreshing for subsequent
        if (isFirstLoad) {
          dispatch({ type: 'SET_LOADING', payload: true });
        } else {
          dispatch({ type: 'SET_REFRESHING', payload: true });
        }

        // Fetch all three in parallel — use allSettled so one failure doesn't block the others
        const results = await Promise.allSettled([
          fetchDashboard(),
          fetchEligibility(),
          fetchProgramConfig(),
        ]);

        // Only set error if all critical fetches failed (dashboard + eligibility)
        const allCriticalFailed = results[0].status === 'rejected' && results[1].status === 'rejected';
        if (allCriticalFailed) {
          dispatch({
            type: 'SET_ERROR',
            payload: 'Failed to load Prive data',
          });
        } else {
          dispatch({ type: 'SET_ERROR', payload: null });
        }
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          payload: err instanceof Error ? err.message : 'Failed to load Prive data',
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_REFRESHING', payload: false });
        pendingRef.current = null;
      }
    })();

    pendingRef.current = promise;
    await promise;
  }, [state.lastFetchedAt, state.dashboard, fetchDashboard, fetchEligibility, fetchProgramConfig]);

  // ── refreshEligibility (standalone) ──────────────────────────────────────

  const refreshEligibilityAction = useCallback(async () => {
    try {
      dispatch({ type: 'SET_REFRESHING', payload: true });
      await fetchEligibility();
    } catch {
      // Error already logged inside fetchEligibility
    } finally {
      dispatch({ type: 'SET_REFRESHING', payload: false });
    }
  }, [fetchEligibility]);

  // ── checkIn ──────────────────────────────────────────────────────────────

  const checkIn = useCallback(async () => {
    try {
      const response = await priveApi.checkIn();
      if (response.success && response.data) {
        // Refresh dashboard to reflect updated streak/coins
        await fetchDashboard();
        // Sync wallet after earning coins
        refreshWallet().catch(() => {});
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Check-in failed. Please try again.' });
      throw err;
    }
  }, [fetchDashboard, refreshWallet]);

  // ── trackOfferClick (fire-and-forget) ────────────────────────────────────

  const trackOfferClick = useCallback((offerId: string) => {
    priveApi.trackOfferClick(offerId).catch(() => { /* silently handle */ });
  }, []);

  // ── Auto-fetch on mount / auth change ────────────────────────────────────

  // Skip during onboarding to prevent thundering herd of API calls on Android
  useEffect(() => {
    if (isAuthenticated && authUser && authUser.isOnboarded) {
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        refreshAll();
      }
    } else if (!isAuthenticated) {
      // Clear on logout
      dispatch({ type: 'RESET' });
      hasFetchedRef.current = false;
    }
  }, [isAuthenticated, authUser]);

  // ── Derived values ───────────────────────────────────────────────────────

  const tier = state.eligibility?.tier ?? state.dashboard?.eligibility?.tier ?? 'none';
  const hasAccess =
    (state.eligibility as any)?.hasAccess === true || tier !== 'none';
  const featuredOffers = state.dashboard?.featuredOffers ?? [];
  const highlights = state.dashboard?.highlights ?? null;
  const dailyProgress = state.dashboard?.dailyProgress ?? null;

  const isFeatureEnabled = useCallback(
    (flag: string): boolean => {
      return state.programConfig?.featureFlags?.[flag] === true;
    },
    [state.programConfig],
  );

  // ── Memoised context value ───────────────────────────────────────────────

  const value = useMemo<PriveContextType>(
    () => ({
      // Raw state
      dashboard: state.dashboard,
      eligibility: state.eligibility,
      programConfig: state.programConfig,
      isLoading: state.isLoading,
      isRefreshing: state.isRefreshing,
      error: state.error,
      lastFetchedAt: state.lastFetchedAt,

      // Derived
      tier,
      hasAccess,
      featuredOffers,
      highlights,
      dailyProgress,
      isFeatureEnabled,

      // Actions
      refreshAll,
      refreshEligibility: refreshEligibilityAction,
      checkIn,
      trackOfferClick,
    }),
    [
      state.dashboard,
      state.eligibility,
      state.programConfig,
      state.isLoading,
      state.isRefreshing,
      state.error,
      state.lastFetchedAt,
      tier,
      hasAccess,
      featuredOffers,
      highlights,
      dailyProgress,
      isFeatureEnabled,
      refreshAll,
      refreshEligibilityAction,
      checkIn,
      trackOfferClick,
    ],
  );

  // Sync to Zustand store for crash-safe fallback
  const _setFromProvider = usePriveStore((s) => s._setFromProvider);
  useEffect(() => {
    _setFromProvider(value);
  }, [value, _setFromProvider]);

  return (
    <PriveContext.Provider value={value}>
      {children}
    </PriveContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
// Hook — falls back to Zustand store for crash safety when outside Provider
export function usePriveContext(): PriveContextType {
  const context = useContext(PriveContext);

  // Zustand fallback selectors (always called — hooks can't be conditional)
  const storeDashboard = usePriveStore((s) => s.dashboard);
  const storeEligibility = usePriveStore((s) => s.eligibility);
  const storeProgramConfig = usePriveStore((s) => s.programConfig);
  const storeIsLoading = usePriveStore((s) => s.isLoading);
  const storeIsRefreshing = usePriveStore((s) => s.isRefreshing);
  const storeError = usePriveStore((s) => s.error);
  const storeLastFetchedAt = usePriveStore((s) => s.lastFetchedAt);
  const storeTier = usePriveStore((s) => s.tier);
  const storeHasAccess = usePriveStore((s) => s.hasAccess);
  const storeFeaturedOffers = usePriveStore((s) => s.featuredOffers);
  const storeHighlights = usePriveStore((s) => s.highlights);
  const storeDailyProgress = usePriveStore((s) => s.dailyProgress);
  const storeIsFeatureEnabled = usePriveStore((s) => s.isFeatureEnabled);
  const storeRefreshAll = usePriveStore((s) => s.refreshAll);
  const storeRefreshEligibility = usePriveStore((s) => s.refreshEligibility);
  const storeCheckIn = usePriveStore((s) => s.checkIn);
  const storeTrackOfferClick = usePriveStore((s) => s.trackOfferClick);

  if (context !== undefined) {
    return context;
  }

  // Fallback to Zustand store (populated by Provider elsewhere in the tree)
  return {
    dashboard: storeDashboard,
    eligibility: storeEligibility,
    programConfig: storeProgramConfig,
    isLoading: storeIsLoading,
    isRefreshing: storeIsRefreshing,
    error: storeError,
    lastFetchedAt: storeLastFetchedAt,
    tier: storeTier,
    hasAccess: storeHasAccess,
    featuredOffers: storeFeaturedOffers,
    highlights: storeHighlights,
    dailyProgress: storeDailyProgress,
    isFeatureEnabled: storeIsFeatureEnabled,
    refreshAll: storeRefreshAll,
    refreshEligibility: storeRefreshEligibility,
    checkIn: storeCheckIn,
    trackOfferClick: storeTrackOfferClick,
  };
}

export { PriveContext };
