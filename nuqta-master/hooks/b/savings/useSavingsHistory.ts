/**
 * useSavingsHistory — paginated history with `loadMore` + `refresh`.
 *
 * Reads from the granular history selectors and exposes an imperative API
 * suitable for `<FlatList>` / `<FlashList>`:
 *   - `refresh()` — resets to page 1.
 *   - `loadMore()` — appends the next page if `hasMore` is true.
 *
 * Lifecycle
 * ---------
 *  - On mount, dispatches `actions.fetchHistory({ reset: true })`.
 *  - The store is responsible for dedupe; calling `refresh` while loading
 *    is safe — it just no-ops.
 *
 * Usage
 * -----
 *  ```tsx
 *  function HistoryScreen() {
 *    const { items, hasMore, isLoading, loadMore, refresh } = useSavingsHistory();
 *    return (
 *      <FlatList
 *        data={items}
 *        onEndReached={loadMore}
 *        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
 *      />
 *    );
 *  }
 *  ```
 */
import { useCallback, useEffect, useRef } from 'react';
import {
  useSavingsHistory as useSavingsHistorySelector,
  useSavingsHistoryPage,
  useSavingsHistoryHasMore,
  useSavingsHistoryTotal,
  useSavingsHistoryLoading,
  useSavingsActions,
} from '@/stores/selectors';
import logger from '@/utils/logger';
import type { SavingsHistoryItem } from '@/types/savings.types';

export interface UseSavingsHistoryResult {
  items: SavingsHistoryItem[];
  page: number;
  hasMore: boolean;
  total: number;
  isLoading: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSavingsHistory(): UseSavingsHistoryResult {
  const items = useSavingsHistorySelector();
  const page = useSavingsHistoryPage();
  const hasMore = useSavingsHistoryHasMore();
  const total = useSavingsHistoryTotal();
  const isLoading = useSavingsHistoryLoading();
  const actions = useSavingsActions();

  const hasFetchedRef = useRef<boolean>(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetcher = (actions as {
      fetchHistory?: (opts?: { reset?: boolean }) => Promise<void>;
    }).fetchHistory;
    if (typeof fetcher !== 'function') {
      logger.warn('savings_history_action_missing', {}, 'B Features');
      return;
    }
    fetcher
      .call(actions, { reset: true })
      .catch((err: unknown) => {
        logger.error(
          'savings_history_fetch_failed',
          err instanceof Error ? err : new Error(String(err)),
          'B Features',
        );
      });
  }, [actions]);

  const refresh = useCallback(async () => {
    const fetcher = (actions as {
      fetchHistory?: (opts?: { reset?: boolean }) => Promise<void>;
    }).fetchHistory;
    if (typeof fetcher !== 'function') {
      logger.warn('savings_history_action_missing', {}, 'B Features');
      return;
    }
    try {
      await fetcher.call(actions, { reset: true });
    } catch (err) {
      logger.error(
        'savings_history_refresh_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, [actions]);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    if (isLoading) return;

    const fetcher = (actions as {
      fetchHistory?: (opts?: { reset?: boolean }) => Promise<void>;
    }).fetchHistory;
    if (typeof fetcher !== 'function') {
      logger.warn('savings_history_action_missing', {}, 'B Features');
      return;
    }
    try {
      await fetcher.call(actions, { reset: false });
    } catch (err) {
      logger.error(
        'savings_history_load_more_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, [actions, hasMore, isLoading]);

  return { items, page, hasMore, total, isLoading, loadMore, refresh };
}

export default useSavingsHistory;