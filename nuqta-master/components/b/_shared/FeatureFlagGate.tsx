/**
 * FeatureFlagGate
 *
 * Conditionally renders children based on a B-feature flag.
 *
 * Contract (locked with user):
 *   - Default behavior is **show children**. The flag is "enabled" unless it
 *     is explicitly set to `false` in `subscriptionStore.featureFlags`.
 *   - Operators disable a feature by flipping its flag to `false` — no rebuild
 *     required. The store is already persisted, so the change survives app
 *     restarts and can be QA'd from the dev menu.
 *   - When disabled, the gate renders either the caller-supplied `fallback`
 *     or a small in-line placeholder explaining how to re-enable the feature.
 *   - Every render where children are hidden emits a `feature_flag_gate_view`
 *     analytics event. Failures to import the analytics service are swallowed
 *     so a missing analytics dependency can't break this gate.
 *
 * Usage:
 *   ```tsx
 *   <FeatureFlagGate flag="b.savings">
 *     <SavingsDashboard />
 *   </FeatureFlagGate>
 *   ```
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFeatureFlag } from '@/hooks/b/useFeatureFlag';
import { colors } from '@/constants/theme';
import type { BFeatureFlag } from '@/types/b-features.types';

export interface FeatureFlagGateProps {
  /** The B-feature flag to gate on. */
  flag: BFeatureFlag;
  /** UI rendered when the flag is enabled. */
  children: React.ReactNode;
  /**
   * Optional UI rendered when the flag is disabled. If omitted, a small
   * inline placeholder with guidance is shown.
   */
  fallback?: React.ReactNode;
  /**
   * When `true`, suppresses the default placeholder even if no `fallback`
   * was supplied (renders nothing on disable). Useful for tightly-coupled
   * additive slots.
   */
  hideOnDisable?: boolean;
}

// try/catch import pattern: analytics service is a soft dependency during
// Phase 0. If it's been removed or relocated in a future refactor, the gate
// keeps working — we just lose the audit event.
let analyticsService:
  | { trackEvent: (name: string, props?: Record<string, unknown>) => void }
  | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@/services/analyticsService');
  analyticsService = mod?.default ?? mod?.analyticsService;
  if (analyticsService && typeof (analyticsService as any).trackEvent !== 'function') {
    // Some analytics services expose `track()` rather than `trackEvent()`.
    if (typeof (analyticsService as any).track === 'function') {
      const fallbackService = analyticsService as unknown as {
        track: (n: string, p?: Record<string, unknown>) => void;
      };
      analyticsService = {
        trackEvent: (name, props) => fallbackService.track(name, props),
      };
    }
  }
} catch {
  analyticsService = undefined;
}

/**
 * Inline placeholder shown when no `fallback` is provided.
 *
 * Kept intentionally tiny — the gate shouldn't compete with surrounding UI.
 */
function DefaultDisabledPlaceholder({ flag }: { flag: BFeatureFlag }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>
        Feature <Text style={styles.placeholderFlag}>{flag}</Text> is disabled.
      </Text>
      <Text style={styles.placeholderHint}>
        Enable it via subscriptionStore.featureFlags.{flag}
      </Text>
    </View>
  );
}

/**
 * FeatureFlagGate — see module-level JSDoc above for the contract.
 */
export function FeatureFlagGate({
  flag,
  children,
  fallback,
  hideOnDisable,
}: FeatureFlagGateProps) {
  const { isEnabled } = useFeatureFlag(flag);

  useEffect(() => {
    if (isEnabled) return;
    if (analyticsService && typeof analyticsService.trackEvent === 'function') {
      try {
        analyticsService.trackEvent('feature_flag_gate_view', { flag });
      } catch {
        // Analytics must never break the UI.
      }
    }
  }, [isEnabled, flag]);

  if (isEnabled) {
    return <>{children}</>;
  }

  if (hideOnDisable) {
    return null;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return <DefaultDisabledPlaceholder flag={flag} />;
}

export default FeatureFlagGate;

const styles = StyleSheet.create({
  placeholder: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderFlag: {
    color: colors.nileBlue,
    fontWeight: '700',
  },
  placeholderHint: {
    marginTop: 4,
    color: colors.text.tertiary,
    fontSize: 12,
  },
});