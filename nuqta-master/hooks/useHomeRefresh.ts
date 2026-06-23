/**
 * useHomeRefresh Hook
 *
 * Extracted from app/(tabs)/index.tsx (lines 204-221)
 * Manages homepage refresh logic with pull-to-refresh
 *
 * @hook
 */

import { useState, useCallback } from 'react';

/**
 * Refresh Actions Interface
 */
export interface RefreshActions {
  /** Refresh homepage data */
  refreshAllSections: () => Promise<void>;
  /** Refresh user statistics */
  refreshUserStatistics?: () => Promise<void>;
}

/**
 * useHomeRefresh Return Type
 */
export interface UseHomeRefreshResult {
  /** Whether refresh is in progress */
  refreshing: boolean;
  /** Trigger refresh manually */
  onRefresh: () => Promise<void>;
}

/**
 * useHomeRefresh Hook
 *
 * Provides pull-to-refresh functionality for homepage:
 * - Manages refreshing state
 * - Calls refresh actions for sections and user data
 * - Handles errors gracefully
 *
 * @param actions - Refresh actions to execute
 * @param hasUser - Whether user is authenticated
 */
export function useHomeRefresh(
  actions: RefreshActions,
  hasUser: boolean
): UseHomeRefreshResult {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      // Refresh all homepage sections
      await actions.refreshAllSections();

      // Also refresh user statistics if user is logged in
      if (hasUser && actions.refreshUserStatistics) {
        await actions.refreshUserStatistics();
      }
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  }, [actions, hasUser]);

  return {
    refreshing,
    onRefresh,
  };
}

export default useHomeRefresh;
