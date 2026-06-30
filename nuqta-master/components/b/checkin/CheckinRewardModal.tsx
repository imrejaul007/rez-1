/**
 * CheckinRewardModal — celebration modal shown after a successful claim.
 *
 * The modal surfaces three things:
 *   1. A big emoji (🎉 for normal days, 🏆 for milestone bonuses).
 *   2. The reward amount in ₹ (coins) and a label describing the bonus.
 *   3. The streak count ("3 day streak!").
 *
 * Plus a simple, library-free "confetti" burst: 8 randomly-positioned
 * emoji particles that fade in then out via `Animated` over ~1.2s. No
 * external animation libraries are pulled in — the migration plan
 * forbids new dependencies for this phase.
 *
 * Props
 * -----
 *   - `reward`     — the `CheckinReward` returned from the claim call.
 *   - `streakDays` — current streak count after the claim.
 *   - `onClose`    — invoked when the user taps "Continue" or the
 *                    backdrop. Required so the parent can dismiss.
 *
 * Behaviour
 * ---------
 *   - The modal mounts/unmounts via `Modal` so it always animates in/out.
 *   - `accessibilityViewIsModal` is set on Android so screen readers
 *     treat it as a separate focus target.
 *   - The Continue button is the only focusable element while the
 *     confetti plays; the backdrop is non-tappable.
 *
 * Accessibility
 * -------------
 *   - Modal root carries `accessibilityLabel` describing the reward.
 *   - Continue button exposes `accessibilityRole="button"`.
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import type { CheckinReward } from '@/hooks/b/checkin/useDailyCheckin';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFETTI_EMOJIS: ReadonlyArray<string> = [
  '🎊',
  '🎉',
  '✨',
  '⭐',
  '🌟',
  '💫',
];

const CONFETTI_COUNT = 8;
const CONFETTI_DURATION_MS = 1200;

// ---------------------------------------------------------------------------
// Sub-component: confetti burst
// ---------------------------------------------------------------------------

interface ConfettiParticle {
  emoji: string;
  translateX: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
}

interface ConfettiBurstProps {
  /** Stable identity seed for the random offsets — recompute each mount. */
  seed: number;
}

function buildParticle(seed: number): ConfettiParticle {
  const emoji = CONFETTI_EMOJIS[seed % CONFETTI_EMOJIS.length] as string;
  return {
    emoji,
    translateX: new Animated.Value(0),
    opacity: new Animated.Value(0),
    rotate: new Animated.Value(0),
  };
}

function ConfettiBurstBase({ seed }: ConfettiBurstProps): React.ReactElement {
  // Pre-compute the static layout once per mount. Random offsets stay
  // stable across the animation but differ between mounts.
  const particles = useMemo<ConfettiParticle[]>(() => {
    const list: ConfettiParticle[] = [];
    for (let i = 0; i < CONFETTI_COUNT; i += 1) {
      list.push(buildParticle(seed + i));
    }
    return list;
  }, [seed]);

  // Each particle's resting position around the centre.
  const offsets = useMemo<Array<{ x: number; y: number }>>(() => {
    const list: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < CONFETTI_COUNT; i += 1) {
      const angle = (i / CONFETTI_COUNT) * Math.PI * 2;
      const radius = 60 + ((seed + i * 7) % 30);
      list.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return list;
  }, [seed]);

  useEffect(() => {
    const animations = particles.map((p, i) => {
      const offset = offsets[i] ?? { x: 0, y: 0 };
      return Animated.parallel([
        Animated.sequence([
          Animated.timing(p.opacity, {
            toValue: 1,
            duration: CONFETTI_DURATION_MS / 3,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: (CONFETTI_DURATION_MS * 2) / 3,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(p.translateX, {
          toValue: offset.x,
          duration: CONFETTI_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: 1,
          duration: CONFETTI_DURATION_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]);
    });
    Animated.stagger(40, animations).start();
  }, [particles, offsets]);

  return (
    <View pointerEvents="none" style={styles.confettiContainer}>
      {particles.map((p, i) => {
        const offset = offsets[i] ?? { x: 0, y: 0 };
        const rotateInterpolate = p.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        });
        return (
          <Animated.Text
            key={`confetti-${i}`}
            style={[
              styles.confettiParticle,
              {
                opacity: p.opacity,
                transform: [
                  { translateX: p.translateX },
                  { translateY: -20 },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          >
            {p.emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const ConfettiBurst = memo(ConfettiBurstBase);

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export interface CheckinRewardModalProps {
  reward: CheckinReward;
  streakDays: number;
  onClose: () => void;
}

/** Title emoji is bigger on milestone bonuses. */
function titleEmojiForReward(reward: CheckinReward): string {
  return reward.isMilestone ? '🏆' : '🎉';
}

/** Format a coin count into a human-friendly rupee string. */
function formatRupees(coins: number): string {
  const safe = Number.isFinite(coins) && coins >= 0 ? Math.floor(coins) : 0;
  return `₹${safe}`;
}

function CheckinRewardModalBase({
  reward,
  streakDays,
  onClose,
}: CheckinRewardModalProps): React.ReactElement {
  // Stable seed so the random layout is consistent during the animation.
  // Initialized lazily via useState to avoid mutating state during render.
  const [seed] = useState<number>(() => Math.floor(Math.random() * 1000) + 1);

  const safeStreak = Number.isFinite(streakDays) && streakDays >= 0
    ? Math.floor(streakDays)
    : 0;

  const titleEmoji = useMemo(() => titleEmojiForReward(reward), [reward]);
  const rewardInRupees = useMemo(
    () => formatRupees(reward.totalCoins),
    [reward.totalCoins],
  );

  const accessibilityLabel = useMemo(() => {
    const label = reward.label.length > 0 ? reward.label : 'Daily reward';
    return `Reward claimed: ${rewardInRupees}, ${label}, ${safeStreak} day streak`;
  }, [rewardInRupees, reward.label, safeStreak]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible
      onRequestClose={onClose}
    >
      <View
        style={styles.backdrop}
        accessibilityViewIsModal
        accessibilityLabel={accessibilityLabel}
      >
        <ConfettiBurst seed={seed} />

        <View style={styles.card}>
          <Text style={styles.bigEmoji}>{titleEmoji}</Text>
          <Text style={styles.title}>Reward claimed!</Text>
          <Text style={styles.amount}>{rewardInRupees}</Text>
          <Text style={styles.label}>{reward.label}</Text>

          <View style={styles.streakRow}>
            <Text style={styles.streakNumber}>{safeStreak}</Text>
            <Text style={styles.streakWord}>
              day{safeStreak === 1 ? '' : 's'} streak!
            </Text>
          </View>

          {reward.bonusCoins > 0 ? (
            <Text style={styles.bonus}>
              +{reward.bonusCoins} bonus coins
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue"
            onPress={onClose}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Feature-flagged wrapper
// ---------------------------------------------------------------------------

/**
 * Wraps the modal in a `<FeatureFlagGate flag="b.dailyCheckin">` so the
 * celebration never surfaces if the parent feature is rolled back.
 *
 * The modal's own UI is always rendered when the flag is enabled —
 * `FeatureFlagGate` simply removes the children from the tree when the
 * flag is disabled, which is exactly what we want here.
 */
function GatedCheckinRewardModal(props: CheckinRewardModalProps): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.dailyCheckin">
      <CheckinRewardModalBase {...props} />
    </FeatureFlagGate>
  );
}

const CheckinRewardModal = memo(GatedCheckinRewardModal);
export default CheckinRewardModal;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 58, 82, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  confettiContainer: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    height: 0,
  },
  confettiParticle: {
    position: 'absolute',
    fontSize: 22,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  bigEmoji: {
    fontSize: 56,
    lineHeight: 64,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.nileBlue,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.gold,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  label: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.nileBlue,
    marginRight: spacing.xs,
  },
  streakWord: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  bonus: {
    ...typography.label,
    color: colors.gold,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  cta: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    minWidth: 160,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '800',
  },
});