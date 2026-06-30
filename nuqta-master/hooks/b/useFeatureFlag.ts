/**
 * useFeatureFlag — read a single B-feature flag from the store.
 *
 * Contract
 * --------
 *   - The flag is enabled unless the store explicitly sets it to `false`.
 *     `undefined`, `null`, and `true` all count as enabled.
 *   - `setFeatureFlag(flag, value)` is a thin wrapper around
 *     `subscriptionStore.setFeatureFlag` (when the store exposes one) and
 *     is a no-op otherwise. This means callers can stay agnostic about the
 *     store's exact API surface during early migration.
 *   - Every successful write is logged via `utils/logger` under the
 *     `feature_flag_change` event so the rollout can be audited.
 *
 * Usage
 * -----
 *   ```ts
 *   const { isEnabled, setFeatureFlag } = useFeatureFlag('b.savings');
 *   if (!isEnabled) return null;
 *   ```
 *
 * Or grab the raw reader if you need it imperatively:
 *   ```ts
 *   const enabled = useFeatureFlagValue('b.savings');
 *   ```
 */

import { useCallback, useMemo } from 'react';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import logger from '@/utils/logger';
import { EMPTY_OBJECT } from '@/utils/zustandStable';
import type { BFeatureFlag, BFeatureFlagMap } from '@/types/b-features.types';

/**
 * Read the entire `featureFlags` map from the subscription store.
 *
 * The store currently exposes `featureFlags` inside `state` (see
 * `stores/subscriptionStore.ts`). This selector is stable across renders
 * because Zustand only re-runs it when the referenced slice changes.
 */
const selectFeatureFlags = (s: ReturnType<typeof useSubscriptionStore.getState>):
  | BFeatureFlagMap
  | Record<string, boolean> => {
  // The store types `featureFlags` as the subscription FEATURE_FLAGS const
  // (a narrower union). We widen to `Record<string, boolean>` here so callers
  // can ask for any B flag without TypeScript complaining.
  const flags = (s.state as { featureFlags?: Record<string, boolean> }).featureFlags;
  return flags ?? EMPTY_OBJECT;
};

const selectSubscriptionActions = (
  s: ReturnType<typeof useSubscriptionStore.getState>,
): unknown => s.actions;

/**
 * Pure, hookless reader. Returns `true` unless the flag is explicitly `false`.
 *
 * Exposed for code paths that need a value but can't call a hook (e.g.
 * inside a callback). All React callers should prefer `useFeatureFlagValue`.
 */
export function readFeatureFlag(flag: BFeatureFlag): boolean {
  // FIX: Use Zustand getState() directly
  const { state } = useSubscriptionStore.getState();
  const flags = state.featureFlags as Record<string, boolean | undefined> | undefined;
  const value = flags?.[flag];
  return value !== false;
}

/**
 * Hook variant of `readFeatureFlag`. Subscribes to the store so the component
 * re-renders when the flag changes.
 */
export function useFeatureFlagValue(flag: BFeatureFlag): boolean {
  const flags = useSubscriptionStore(selectFeatureFlags);
  return useMemo(() => {
    const value = (flags as Record<string, boolean | undefined>)[flag];
    return value !== false;
  }, [flags, flag]);
}

/**
 * Full hook: returns the current value plus a setter.
 *
 * @param flag  The B feature flag to read.
 * @returns     `{ isEnabled, value, setFeatureFlag }`.
 */
export function useFeatureFlag(flag: BFeatureFlag): {
  isEnabled: boolean;
  value: boolean;
  setFeatureFlag: (flag: BFeatureFlag, value: boolean) => void;
} {
  const value = useFeatureFlagValue(flag);
  const actions = useSubscriptionStore(selectSubscriptionActions);

  const setFeatureFlag = useCallback(
    (targetFlag: BFeatureFlag, nextValue: boolean) => {
      // The store may or may not expose `setFeatureFlag` yet; guard via duck
      // typing so we don't crash during early migration.
      const maybeSetter = (actions as { setFeatureFlag?: (f: string, v: boolean) => void })
        .setFeatureFlag;

      if (typeof maybeSetter === 'function') {
        try {
          maybeSetter(targetFlag, nextValue);
        } catch (err) {
          logger.warn(
            'feature_flag_setter_threw',
            { flag: targetFlag, value: nextValue, error: String(err) },
            'B Features',
          );
        }
      } else {
        // No setter yet — log and no-op. Operators can still flip the flag
        // by editing the persisted store directly.
        logger.info(
          'feature_flag_setter_missing',
          { flag: targetFlag, value: nextValue },
          'B Features',
        );
      }

      logger.info('feature_flag_change', { flag: targetFlag, value: nextValue }, 'B Features');
    },
    [actions],
  );

  return { isEnabled: value, value, setFeatureFlag };
}

export default useFeatureFlag;
