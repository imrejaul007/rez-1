/**
 * AnimatedCounter — animates a numeric value from 0 to its final value.
 *
 * Visual contract
 * ---------------
 *   - Renders a single Text node that counts up from 0 to `value`.
 *   - Supports an optional `prefix` and `suffix` (e.g. "₹" or "%").
 *   - The animated portion is the number only; prefix/suffix are static.
 *
 * Animation
 * ---------
 *   - Uses `Animated.timing` with `useNativeDriver: false` because the
 *     animated value (a number) is fed into a Text node, which cannot
 *     be driven by the native thread.
 *   - Duration is configurable via the `duration` prop (default 1500ms).
 *   - Easing defaults to `Easing.out(Easing.cubic)` for a natural feel.
 *
 * Accessibility
 * -------------
 *   - When the system preference `prefers-reduced-motion` is "reduce",
 *     the component skips the animation and displays the final value
 *     instantly.
 *   - The `enabled` prop (`true` by default) also gates the animation;
 *     set to `false` to disable animation programmatically.
 *   - The Text node has an `accessibilityRole="text"` and a spoken
 *     `accessibilityLabel` that includes the fully-resolved value
 *     (prefix + formatted number + suffix).
 *
 * Number formatting
 * ----------------
 *   - Numbers are formatted with `Intl.NumberFormat('en-IN')` so they
 *     respect Indian locale conventions (e.g. 1,23,456 instead of
 *     123,456).
 *   - Large values are abbreviated to one decimal place when ≥ 1 lakh
 *     (1,00,000) using the "L" suffix, and ≥ 1 crore using "Cr".
 *
 * Performance
 * ----------
 *   - Wrapped in `React.memo` so it only re-renders when `value`,
 *     `prefix`, `suffix`, `duration`, `enabled`, or `style` change.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { colors, typography } from '@/constants/theme';

const DEFAULT_DURATION = 1500;
const LAKH = 100_000;
const CRORE = 10_000_000;
const INDIAN_LOCALE = 'en-IN';

/** Check if the user has requested reduced motion at the OS level. */
function prefersReducedMotion(): boolean {
  // On web we can query the media query directly.
  // On native platforms we default to false; the OS-level preference
  // is respected only when a matching platform API is available.
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

/**
 * Format a number using Indian locale conventions.
 *
 * - Values >= 1 crore are shown as "X.X Cr"
 * - Values >= 1 lakh are shown as "X.X L"
 * - Otherwise formatted with Indian thousand-separator rules.
 */
function formatIndianNumber(value: number): string {
  if (value >= CRORE) {
    const crores = value / CRORE;
    return `${crores.toFixed(1)} Cr`;
  }
  if (value >= LAKH) {
    const lakhs = value / LAKH;
    return `${lakhs.toFixed(1)} L`;
  }
  return new Intl.NumberFormat(INDIAN_LOCALE).format(Math.round(value));
}

/** Full formatted string including optional prefix/suffix. */
function buildAccessibilityLabel(prefix: string, value: number, suffix: string): string {
  const formatted = formatIndianNumber(value);
  return `${prefix}${formatted}${suffix}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AnimatedCounterProps {
  /** The final numeric value to animate toward. */
  value: number;

  /**
   * Animation duration in milliseconds.
   * @default 1500
   */
  duration?: number;

  /**
   * Static string rendered before the number (e.g. "₹", "$").
   * @default ""
   */
  prefix?: string;

  /**
   * Static string rendered after the number (e.g. "%", " pts").
   * @default ""
   */
  suffix?: string;

  /**
   * When `false`, the animation is skipped and the final value is displayed
   * immediately.
   * @default true
   */
  enabled?: boolean;

  /**
   * Optional style overrides for the Text node.
   */
  style?: TextStyleProp;
}

/** Re-declare so the type works in both RN and RN Web environments. */
type TextStyleProp = React.ComponentProps<typeof Text>['style'];

function AnimatedCounterBase({
  value,
  duration = DEFAULT_DURATION,
  prefix = '',
  suffix = '',
  enabled = true,
  style,
}: AnimatedCounterProps): React.ReactElement {
  // Animated value that drives the counting effect.
  const animatedValueRef = useRef<Animated.Value>(
    new Animated.Value(0),
  ).current;

  // Snapshot of the animated value for display — updated in the animation loop.
  const [displayValue, setDisplayValue] = useState<number>(0);

  // Keep the latest target so the animation always runs to the current value.
  const targetRef = useRef<number>(value);
  targetRef.current = value;

  // Re-run the animation whenever `value`, `duration`, or `enabled` changes.
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      // Skip animation: show the final value immediately.
      setDisplayValue(value);
      animatedValueRef.setValue(value);
      return;
    }

    // Reset to zero before starting so repeated mounts/renders animate correctly.
    animatedValueRef.setValue(0);

    const animation = Animated.timing(animatedValueRef, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    // Sync state with the animated value on each frame.
    const listenerId = animatedValueRef.addListener(({ value: v }) => {
      setDisplayValue(v);
    });

    animation.start(({ finished }) => {
      // Ensure we land exactly on the target value when animation completes.
      animatedValueRef.removeListener(listenerId);
      if (finished) {
        setDisplayValue(targetRef.current);
      }
    });

    return () => {
      animatedValueRef.removeListener(listenerId);
      animation.stop();
    };
  }, [value, duration, enabled, animatedValueRef]);

  const formattedNumber = useMemo(
    () => formatIndianNumber(displayValue),
    [displayValue],
  );

  const accessibilityLabel = useMemo(
    () => buildAccessibilityLabel(prefix, value, suffix),
    [prefix, value, suffix],
  );

  return (
    <Text
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      {prefix}
      {formattedNumber}
      {suffix}
    </Text>
  );
}

/**
 * AnimatedCounter — memoized public export.
 *
 * Re-renders only when `value`, `prefix`, `suffix`, `duration`,
 * `enabled`, or `style` change.
 */
const AnimatedCounter = React.memo(AnimatedCounterBase);

export default AnimatedCounter;
