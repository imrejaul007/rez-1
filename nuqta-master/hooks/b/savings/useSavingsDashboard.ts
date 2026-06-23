/**
 * useSavingsDashboard — wires the dashboard fetch into a component.
 *
 * Reads the `SavingsDashboard` payload from the granular selectors and kicks
 * off an initial fetch if the slice is empty. Components only need to handle
 * loading / error / data — the hook does the lifecycle.
 *
 * Lifecycle
 * ---------
 *  - On mount, if `dashboard` is null and no fetch is in flight, dispatches
 *    `actions.fetchDashboard()`.
 *  - Logs `savings_dashboard_loaded` once the first non-null payload arrives.
 *  - Exposes a `refresh()` callback that forces a re-fetch (handy for
 *    pull-to-refresh).
 *
 * Usage
 * -----
 *  ```tsx
 *  function DashboardScreen() {
 *    const { dashboard, isLoading, error, refresh } = useSavingsDashboard();
 *    if (isLoading) return <Skeleton />;
 *    if (error) return <ErrorState onRetry={refresh} />;
 *    return <Dashboard data={dashboard} />;
 *  }
 *  ```
 */
import { useCallback, useEffect, useRef } from 'react';
import {
  useSavingsDashboard as useSavingsDashboardSelector,
  useSavingsLoading,
  useSavingsError,
  useSavingsActions,
} from '@/stores/selectors';
import logger from '@/utils/logger';
import type { SavingsDashboard } from '@/types/savings.types';

export interface UseSavingsDashboardResult {
  dashboard: SavingsDashboard | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSavingsDashboard(): UseSavingsDashboardResult {
  const dashboard = useSavingsDashboardSelector();
  const isLoading = useSavingsLoading();
  const error = useSavingsError();
  const actions = useSavingsActions();

  // Track whether we've already kicked off the initial fetch for this
  // mount of the hook, so we don't refetch on every store change.
  const hasFetchedRef = useRef<boolean>(false);
  const hasLoggedRef = useRef<boolean>(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    if (dashboard !== null) {
      // Data is already present in the store — don't refetch, but consider
      // the "initial fetch" as satisfied for this hook instance.
      hasFetchedRef.current = true;
      return;
    }
    if (isLoading) {
      // A fetch is already in flight (probably from another consumer).
      hasFetchedRef.current = true;
      return;
    }

    hasFetchedRef.current = true;

    // Defensive: the action shape isn't frozen yet, so duck-type it.
    const fetcher = (actions as { fetchDashboard?: () => Promise<void> })
      .fetchDashboard;
    if (typeof fetcher === 'function') {
      fetcher.call(actions).catch((err: unknown) => {
        logger.error(
          'savings_dashboard_fetch_failed',
          err instanceof Error ? err : new Error(String(err)),
          'B Features',
        );
      });
    } else {
      logger.warn(
        'savings_dashboard_action_missing',
        {},
        'B Features',
      );
    }
  }, [dashboard, isLoading, actions]);

  // Log once the first payload lands.
  useEffect(() => {
    if (hasLoggedRef.current) return;
    if (dashboard === null) return;
    hasLoggedRef.current = true;
    logger.info(
      'savings_dashboard_loaded',
      {
        totalSavedPaise: dashboard.totalSavedPaise,
        thisMonthSavedPaise: dashboard.thisMonthSavedPaise,
        goalsCount: dashboard.goalsCount ?? 0,
        streakDays: dashboard.streak?.currentStreakDays ?? 0,
      },
      'B Features',
    );
  }, [dashboard]);

  const refresh = useCallback(async () => {
    const fetcher = (actions as { fetchDashboard?: () => Promise<void> })
      .fetchDashboard;
    if (typeof fetcher !== 'function') {
      logger.warn('savings_dashboard_action_missing', {}, 'B Features');
      return;
    }
    try {
      await fetcher.call(actions);
    } catch (err) {
      logger.error(
        'savings_dashboard_refresh_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, [actions]);

  return { dashboard, isLoading, error, refresh };
}

export default useSavingsDashboard;