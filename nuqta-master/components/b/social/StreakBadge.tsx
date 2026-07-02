/**
 * StreakBadge — visual badge that celebrates daily engagement streaks.
 *
 * Visual contract
 * ---------------
 *   - 0-2 days  : shows a calendar icon (📅) with calm styling
 *   - 3-29 days : shows a fire icon (🔥) with a pulse/scale animation
 *   - 30+ days  : shows a crown icon (👑) with a gold gradient border
 *   - Motivational message displayed below the badge
 *
 * Props
 * -----
 *   days   : number   — current streak length
 *   enabled? : boolean — when false, renders nothing (default: true)
 *
 * Accessibility
 * -------------
 *   - `accessibilityLabel` describes the streak level and days
 *   - Decorative elements are marked hidden from screen readers
 *
 * Implementation notes
 * --------------------
 *   - Uses React Native's `Animated` API for the pulse loop on fire badge
 *   - Scale animation (1.0 → 1.15 → 1.0) with 1.5s cycle
 *   - `Animated.loop` started in useEffect, cleaned up on unmount
 *   - Supports React Native Web via standard StyleSheet patterns
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, spacing, borderRadius, typography, shadows } from '@/constants/theme';

// ============================================================================
// CONSTANTS
// ============================================================================

const PULSE_DURATION_MS = 1500;
const SCALE_MIN = 1.0;
const SCALE_MAX = 1.15;

/** Derive the motivational message from streak length. */
function getMessage(days: number): string {
  if (days === 0) return 'Start today!';
  if (days === 1) return 'Keep it going!';
  if (days === 2) return 'Building momentum!';
  if (days >= 3 && days <= 6) return 'On fire!';
  if (days >= 7 && days <= 13) return 'Great week!';
  if (days >= 14 && days <= 29) return 'Incredible streak!';
  return 'Legendary!';
}

/** Derive the badge emoji from streak length. */
function getBadgeEmoji(days: number): string {
  if (days >= 30) return '👑';
  if (days >= 3) return '🔥';
  return '📅';
}

/** Determine badge tier. */
type BadgeTier = 'calendar' | 'fire' | 'crown';
function getBadgeTier(days: number): BadgeTier {
  if (days >= 30) return 'crown';
  if (days >= 3) return 'fire';
  return 'calendar';
}

// ============================================================================
// ANIMATED SUB-COMPONENTS
// ============================================================================

interface CalendarBadgeProps {
  scale: Animated.Value;
}

function CalendarBadge({ scale }: CalendarBadgeProps): React.ReactElement {
  return (
    <Animated.View style={[styles.badgeContainer, { transform: [{ scale }] }]}>
      <View style={[styles.badgeCircle, styles.calendarCircle]}>
        <Text style={styles.emoji}>📅</Text>
      </View>
    </Animated.View>
  );
}

interface FireBadgeProps {
  scale: Animated.Value;
}

function FireBadge({ scale }: FireBadgeProps): React.ReactElement {
  return (
    <Animated.View style={[styles.badgeContainer, { transform: [{ scale }] }]}>
      <View style={[styles.badgeCircle, styles.fireCircle]}>
        <Text style={styles.emoji}>🔥</Text>
      </View>
    </Animated.View>
  );
}

interface CrownBadgeProps {
  scale: Animated.Value;
}

function CrownBadge({ scale }: CrownBadgeProps): React.ReactElement {
  return (
    <Animated.View style={[styles.badgeContainer, { transform: [{ scale }] }]}>
      <LinearGradient
        colors={gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.crownGradientWrapper}
      >
        <View style={[styles.badgeCircle, styles.crownCircle]}>
          <Text style={styles.emoji}>👑</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface StreakBadgeProps {
  /** Current streak length in days. */
  days: number;
  /** When false, renders nothing. Defaults to true. */
  enabled?: boolean;
  /** Optional style override for the root container. */
  style?: ViewStyle;
}

/**
 * StreakBadge — public component.
 *
 * Renders a tiered badge with a motivational message based on streak length.
 */
function StreakBadge({ days, enabled = true, style }: StreakBadgeProps): React.ReactElement | null {
  // Pulse scale animation — always created but only runs when relevant.
  const scaleAnim = useRef(new Animated.Value(SCALE_MIN)).current;

  const tier = getBadgeTier(days);
  const emoji = getBadgeEmoji(days);
  const message = getMessage(days);

  // Build accessibility label.
  const accessibilityLabel = useMemo(() => {
    if (days === 0) return 'Streak: 0 days. Start today!';
    const suffix = days === 1 ? 'day' : 'days';
    return `Streak: ${days} ${suffix}. ${message}`;
  }, [days, message]);

  // Pulse loop for fire and crown tiers.
  useEffect(() => {
    if (tier === 'calendar') {
      scaleAnim.setValue(SCALE_MIN);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: SCALE_MAX,
          duration: PULSE_DURATION_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: SCALE_MIN,
          duration: PULSE_DURATION_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [tier, scaleAnim]);

  if (!enabled || !Number.isFinite(days)) {
    return null;
  }

  const renderBadge = () => {
    switch (tier) {
      case 'calendar':
        return <CalendarBadge scale={scaleAnim} />;
      case 'fire':
        return <FireBadge scale={scaleAnim} />;
      case 'crown':
        return <CrownBadge scale={scaleAnim} />;
    }
  };

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      {/* Decorative outer glow for crown badge */}
      {tier === 'crown' && (
        <View style={styles.crownGlow} accessibilityElementsHidden importantForAccessibility="no" />
      )}

      {renderBadge()}

      {/* Days counter */}
      <Text style={styles.daysCount} accessibilityElementsHidden importantForAccessibility="no">
        {days > 0 ? `${days}` : ''}
      </Text>

      {/* Motivational message */}
      <Text style={[styles.message, tier === 'crown' && styles.crownMessage]}>
        {message}
      </Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minWidth: 100,
  },
  badgeContainer: {
    marginBottom: spacing.xs,
  },
  badgeCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  calendarCircle: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  fireCircle: {
    backgroundColor: colors.warningScale[50],
    borderWidth: 2,
    borderColor: colors.warning,
  },
  crownCircle: {
    backgroundColor: colors.background.primary,
    borderWidth: 0,
  },
  crownGradientWrapper: {
    borderRadius: borderRadius.full,
    padding: 3,
    ...shadows.strong,
  },
  crownGlow: {
    position: 'absolute',
    top: -spacing.sm,
    left: -spacing.sm,
    right: -spacing.sm,
    bottom: -spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold,
    opacity: 0.15,
    zIndex: -1,
  },
  emoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  daysCount: {
    ...typography.label,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    minHeight: 20,
  },
  message: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 120,
  },
  crownMessage: {
    color: colors.gold,
    fontWeight: '700',
  },
});

export default React.memo(StreakBadge);
