/**
 * useSavingsGoals — CRUD wrapper around the goals slice of the savings store.
 *
 * Wraps the granular selectors with a tidy imperative API for screens:
 *   - `create(input)`  — POST a new goal, store updates on success.
 *   - `update(id, patch)` — partial update of an existing goal.
 *   - `remove(id)`     — DELETE the goal.
 *   - `refresh()`      — re-fetch the list.
 *
 * Errors surface through the store's `error` field rather than throwing,
 * so screens can `useSavingsError()` to display a banner. We do `try/catch`
 * around each call so a thrown error doesn't crash the screen — instead we
 * log and let the store's `error` slice be the source of truth.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { goals, isMutating, create, update, remove } = useSavingsGoals();
 *  ```
 */
import { useCallback, useEffect, useRef } from 'react';
import {
  useSavingsGoals as useSavingsGoalsSelector,
  useSavingsMutating,
  useSavingsError,
  useSavingsActions,
} from '@/stores/selectors';
import logger from '@/utils/logger';
import type { SavingsGoal } from '@/types/savings.types';

/**
 * Shape of a `create` payload. Mirrors the backend's `createGoal` input.
 *
 * Kept narrow on purpose — the hook is a thin wrapper, the store/API is
 * the type authority.
 */
export interface CreateGoalInput {
  name: string;
  targetPaise: number;
  deadline?: string; // ISO date
  category?: string;
  iconEmoji?: string;
}

/**
 * Shape of an `update` patch. All fields optional.
 */
export type UpdateGoalPatch = Partial<Omit<CreateGoalInput, 'name'>> & {
  name?: string;
  savedPaise?: number;
};

export interface UseSavingsGoalsResult {
  goals: SavingsGoal[];
  isMutating: boolean;
  error: string | null;
  create: (input: CreateGoalInput) => Promise<SavingsGoal | null>;
  update: (id: string, patch: UpdateGoalPatch) => Promise<SavingsGoal | null>;
  remove: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSavingsGoals(): UseSavingsGoalsResult {
  const goals = useSavingsGoalsSelector();
  const isMutating = useSavingsMutating();
  const error = useSavingsError();
  const actions = useSavingsActions();

  const hasFetchedRef = useRef<boolean>(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    if (goals.length > 0) {
      hasFetchedRef.current = true;
      return;
    }
    hasFetchedRef.current = true;

    const fetcher = (actions as { fetchGoals?: () => Promise<void> })
      .fetchGoals;
    if (typeof fetcher !== 'function') {
      logger.warn('savings_goals_action_missing', {}, 'B Features');
      return;
    }
    fetcher.call(actions).catch((err: unknown) => {
      logger.error(
        'savings_goals_fetch_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    });
  }, [goals.length, actions]);

  const create = useCallback(
    async (input: CreateGoalInput): Promise<SavingsGoal | null> => {
      const fn = (actions as {
        createGoal?: (i: {
          name: string;
          targetAmountPaise: number;
          deadline: string;
          category?: string;
        }) => Promise<SavingsGoal | null>;
      }).createGoal;
      if (typeof fn !== 'function') {
        logger.warn('savings_goals_create_action_missing', {}, 'B Features');
        return null;
      }
      try {
        // Translate the hook's `targetPaise` field name to the store/API's
        // `targetAmountPaise` field name.
        const result = await fn.call(actions, {
          name: input.name,
          targetAmountPaise: input.targetPaise,
          deadline: input.deadline ?? new Date().toISOString(),
          category: input.category,
        });
        logger.info(
          'savings_goal_created',
          { name: input.name, targetPaise: input.targetPaise },
          'B Features',
        );
        return result;
      } catch (err) {
        logger.error(
          'savings_goal_create_failed',
          err instanceof Error ? err : new Error(String(err)),
          'B Features',
        );
        return null;
      }
    },
    [actions],
  );

  const update = useCallback(
    async (id: string, patch: UpdateGoalPatch): Promise<SavingsGoal | null> => {
      const fn = (actions as {
        updateGoal?: (id: string, patch: UpdateGoalPatch) => Promise<SavingsGoal | null>;
      }).updateGoal;
      if (typeof fn !== 'function') {
        logger.warn('savings_goals_update_action_missing', {}, 'B Features');
        return null;
      }
      try {
        const result = await fn.call(actions, id, patch);
        logger.info('savings_goal_updated', { id }, 'B Features');
        return result;
      } catch (err) {
        logger.error(
          'savings_goal_update_failed',
          err instanceof Error ? err : new Error(String(err)),
          'B Features',
        );
        return null;
      }
    },
    [actions],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const fn = (actions as {
        deleteGoal?: (id: string) => Promise<boolean>;
      }).deleteGoal;
      if (typeof fn !== 'function') {
        logger.warn('savings_goals_delete_action_missing', {}, 'B Features');
        return false;
      }
      try {
        const result = await fn.call(actions, id);
        logger.info('savings_goal_deleted', { id }, 'B Features');
        return result;
      } catch (err) {
        logger.error(
          'savings_goal_delete_failed',
          err instanceof Error ? err : new Error(String(err)),
          'B Features',
        );
        return false;
      }
    },
    [actions],
  );

  const refresh = useCallback(async () => {
    const fetcher = (actions as { fetchGoals?: () => Promise<void> })
      .fetchGoals;
    if (typeof fetcher !== 'function') {
      logger.warn('savings_goals_action_missing', {}, 'B Features');
      return;
    }
    try {
      await fetcher.call(actions);
    } catch (err) {
      logger.error(
        'savings_goals_refresh_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, [actions]);

  return { goals, isMutating, error, create, update, remove, refresh };
}

export default useSavingsGoals;