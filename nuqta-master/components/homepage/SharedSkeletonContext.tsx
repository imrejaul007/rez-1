import React from 'react';
import {
  Platform,
  Animated,
} from 'react-native';

/**
 * Shared Skeleton Animation — Module-level Singleton
 *
 * Provides a SINGLE Animated.Value for ALL skeleton shimmer effects across the app.
 * Instead of each SkeletonLoader running its own animation (20+ simultaneous animations),
 * every skeleton interpolates from this shared value (1 animation total).
 *
 * This is a module-level singleton (NOT a React context/provider).
 * The animation starts on first access and runs forever.
 *
 * NOTE: This intentionally uses RN's Animated API (not reanimated) because it operates
 * at module scope outside of React components. Reanimated's shared values require
 * React component context. The consumers of this value use it with RN's Animated.View.
 */

let _sharedShimmerValue: Animated.Value | null = null;
let _animationStarted = false;

function ensureShimmerValue(): Animated.Value {
  if (!_sharedShimmerValue) {
    _sharedShimmerValue = new Animated.Value(0);

    if (!_animationStarted) {
      _animationStarted = true;

      // Static opacity on iOS to prevent conflicts with Pressable
      if (Platform.OS === 'ios') {
        _sharedShimmerValue.setValue(0.5);
      } else {
        const runShimmer = () => {
          if (!_sharedShimmerValue) return;
          Animated.sequence([
            Animated.timing(_sharedShimmerValue, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(_sharedShimmerValue, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]).start((finished) => {
            if (finished) {
              runShimmer();
            }
          });
        };
        runShimmer();
      }
    }
  }
  return _sharedShimmerValue;
}

/**
 * Get the shared shimmer Animated.Value (module-level singleton).
 * Safe to call outside React components.
 */
export function getSharedShimmerValue(): Animated.Value {
  return ensureShimmerValue();
}

/**
 * Hook to get the shared shimmer animation value.
 * Returns an Animated.Value cycling 0->1->0 (1s each direction).
 * Uses the module-level singleton — no provider needed.
 */
export function useSharedShimmer(): Animated.Value {
  return ensureShimmerValue();
}

// ── Backwards compatibility ──
// SharedSkeletonProvider is now a passthrough — kept so existing imports don't break.

export function SharedSkeletonProvider({ children }: { children: React.ReactNode }) {
  ensureShimmerValue();
  return <>{children}</>;
}

export default { getSharedShimmerValue, useSharedShimmer };
