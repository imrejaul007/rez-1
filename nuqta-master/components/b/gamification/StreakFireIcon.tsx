/**
 * StreakFireIcon — Phase 1.3 visual indicator for the user's daily streak.
 *
 * Renders a 🔥 emoji with the day count overlaid. The icon scales by streak
 * length and animates a "spark" (opacity loop) when the streak is ≥ 7 days.
 *
 * Props
 * -----
 *   streakDays : number
 *     Current streak length. When 0 the component renders `null` (caller can
 *     render their own zero-state if needed).
 *
 *   size? : number
 *     Override the base font size in points. When omitted, the size is
 *     picked from the streak length:
 *        1–6 days   → 32pt (small)
 *        7–29 days  → 44pt (medium)
 *        30+ days   → 60pt (large)
 *
 *   onPress? : () => void
 *     Optional press handler. When supplied, the component wraps itself in a
 *     `Pressable` with appropriate accessibilityRole / accessibilityLabel.
 *
 * Accessibility
 * -------------
 *   - `accessibilityLabel` is set to "Streak: <N> days".
 *   - When `onPress` is supplied, `accessibilityRole` is "button" and a
 *     `accessibilityHint` describing the tap target is exposed.
 *   - Decorative spark views are marked `accessibilityElementsHidden` so
 *     screen readers don't read the inner overlay text twice.
 *
 * Implementation notes
 * --------------------
 *   - Uses React Native's `Animated.Value` (not Reanimated) to keep the
 *     spark loop cheap and isolated to this single component.
 *   - The animation is started/stopped via the `useEffect` cleanup function
 *     so we don't leak running loops on unmount.
 *   - `useNativeDriver: true` for the opacity loop.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/constants/theme';

export interface StreakFireIconProps {
  streakDays: number;
  size?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Pick a default font size from streak length, in points. */
function defaultSizeForStreak(streakDays: number): number {
  if (streakDays >= 30) return 60;
  if (streakDays >= 7) return 44;
  return 32;
}

function StreakFireIconBase({
  streakDays,
  size,
  onPress,
  style,
}: StreakFireIconProps) {
  // Streak of 0 → render nothing. Callers can compose a zero-state above
  // this component if they want a "no streak" placeholder.
  if (!Number.isFinite(streakDays) || streakDays <= 0) {
    return null;
  }

  const resolvedSize = size ?? defaultSizeForStreak(streakDays);
  const isSparking = streakDays >= 7;

  // Spark animation — opacity loop, 1.2s cycle, only runs when streak ≥ 7.
  const sparkOpacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (!isSparking) {
      sparkOpacity.setValue(0.55);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sparkOpacity, {
          toValue: 0.55,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [isSparking, sparkOpacity]);

  const accessibilityLabel = useMemo(
    () => `Streak: ${streakDays} day${streakDays === 1 ? '' : 's'}`,
    [streakDays],
  );

  const inner = (
    <View
      style={[styles.container, { width: resolvedSize + 12, height: resolvedSize + 12 }, style]}
    >
      <Text
        style={[styles.flame, { fontSize: resolvedSize, lineHeight: resolvedSize + 4 }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        🔥
      </Text>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sparkLayer,
          isSparking ? { opacity: sparkOpacity } : null,
        ]}
      >
        <Text
          style={[
            styles.daysOverlay,
            {
              fontSize: Math.max(10, Math.round(resolvedSize * 0.32)),
              lineHeight: Math.max(12, Math.round(resolvedSize * 0.36)),
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {streakDays}
        </Text>
      </Animated.View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to view your loyalty hub."
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [pressed ? styles.pressed : null]}
      >
        {inner}
      </Pressable>
    );
  }

  // Non-interactive — still expose the label for screen readers.
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  flame: {
    textAlign: 'center',
  },
  sparkLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysOverlay: {
    color: colors.nileBlue,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});

const StreakFireIcon = React.memo(StreakFireIconBase);
export default StreakFireIcon;