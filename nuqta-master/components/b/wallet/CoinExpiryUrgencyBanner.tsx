/**
 * CoinExpiryUrgencyBanner — sticky top-of-screen banner for ≤ 7 day expiries.
 *
 * Visual contract (per Phase 1.2 spec):
 *   - Red background + flame icon.
 *   - Slide-in animation from the top.
 *   - "Don't lose ₹X — expires in Y days" copy.
 *   - Dismiss button (X) that persists dismissal to AsyncStorage so the
 *     banner doesn't reappear until either a new urgent coin surfaces or
 *     the dismissal expires.
 *
 * Behaviour
 * ---------
 *   - Reads via `useCoinExpiry()`. Hidden when no notice has `severity`
 *     `'urgent'` (≤ 7 days). Auto-hides once dismissed.
 *   - The dismissal TTL is intentionally generous (12h) so a user who
 *     taps "X" gets a meaningful break but isn't locked out forever.
 *   - Wrapped in `<FeatureFlagGate flag="b.coinExpiry">` at the public
 *     export site so the whole component can be killed at runtime.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { useCoinExpiry } from '@/hooks/b/wallet/useCoinExpiry';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import logger from '@/utils/logger';
import {
  COIN_EXPIRY_DISMISSED_KEY,
  CoinExpiryNotice,
} from '@/types/coin-expiry.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How long a dismissal sticks for, in milliseconds (12 hours). */
const DISMISS_DURATION_MS = 12 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CoinExpiryUrgencyBannerBase(): React.ReactElement | null {
  const { notices } = useCoinExpiry();

  // The most-urgent notice that's ≤ 7 days out. The hook sorts ASC so
  // the first urgent-severity entry is the one to show.
  const urgentNotice: CoinExpiryNotice | undefined = notices.find(
    (n) => n.severity === 'urgent',
  );

  // Three states:
  //   - `null`   → still reading AsyncStorage, render nothing yet
  //   - `false`  → not dismissed (or dismissal expired), banner can show
  //   - `true`   → dismissed within window, suppress the banner
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  // Slide-in animation value.
  const slideAnim = useRef(new Animated.Value(-120)).current;

  // Read dismissal state on mount and when the urgent notice changes.
  useEffect(() => {
    if (!urgentNotice) {
      setDismissed(null);
      return;
    }
    let cancelled = false;
    AsyncStorage.getItem(COIN_EXPIRY_DISMISSED_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (!raw) {
          setDismissed(false);
          return;
        }
        const dismissedAt = Number.parseInt(raw, 10);
        if (!Number.isFinite(dismissedAt)) {
          setDismissed(false);
          return;
        }
        const age = Date.now() - dismissedAt;
        setDismissed(age >= 0 && age < DISMISS_DURATION_MS);
      })
      .catch((err: unknown) => {
        logger.warn(
          'coin_expiry_urgency_storage_read_failed',
          { error: String(err) },
          'B Features',
        );
        if (!cancelled) setDismissed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [urgentNotice]);

  // Slide-in animation. Runs when we know the user hasn't dismissed it
  // and there's actually an urgent notice to show.
  useEffect(() => {
    if (dismissed !== false) return;
    if (!urgentNotice) return;
    slideAnim.setValue(-120);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [dismissed, urgentNotice, slideAnim]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
    AsyncStorage.setItem(COIN_EXPIRY_DISMISSED_KEY, String(Date.now())).catch(
      (err: unknown) => {
        logger.warn(
          'coin_expiry_urgency_storage_write_failed',
          { error: String(err) },
          'B Features',
        );
      },
    );
  }, [slideAnim]);

  // Render nothing during the AsyncStorage read or when there's nothing
  // urgent to show or the user dismissed it.
  if (dismissed === null) return null;
  if (dismissed === true) return null;
  if (!urgentNotice) return null;

  const amountLabel =
    formatPrice(urgentNotice.amountPaise / 100, 'INR', false) ?? '₹0';
  const daysLabel = describeDays(urgentNotice.daysLeft);
  const accessibilityLabel = `Urgent: Don't lose ${amountLabel} from ${urgentNotice.coinName}. ${daysLabel} until expiry.`;

  return (
    <Animated.View
      style={[styles.outer, { transform: [{ translateY: slideAnim }] }]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="alert"
    >
      <View style={styles.row}>
        <Text
          style={styles.icon}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          🔥
        </Text>
        <View style={styles.textColumn}>
          <Text style={styles.title} numberOfLines={1}>
            Don't lose {amountLabel}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {urgentNotice.coinName} expires in {daysLabel}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss coin expiry alert"
          hitSlop={12}
          onPress={handleDismiss}
          style={({ pressed }) => [styles.dismiss, pressed && styles.dismissPressed]}
        >
          <Text
            style={styles.dismissIcon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            ✕
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function describeDays(daysLeft: number): string {
  if (daysLeft <= 0) return 'today';
  if (daysLeft === 1) return '1 day';
  return `${daysLeft} days`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.error,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  icon: {
    fontSize: 22,
    marginRight: spacing.sm,
    color: colors.text.inverse,
  },
  textColumn: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    ...typography.label,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.inverse,
    marginTop: 2,
    opacity: 0.9,
  },
  dismiss: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissPressed: {
    opacity: 0.7,
  },
  dismissIcon: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// Public, gated component
// ---------------------------------------------------------------------------

/**
 * CoinExpiryUrgencyBanner — public default export. Wraps the base
 * component in `<FeatureFlagGate flag="b.coinExpiry">` so the rollout
 * can be flipped off without a rebuild.
 */
function CoinExpiryUrgencyBanner(): React.ReactElement | null {
  return (
    <FeatureFlagGate flag="b.coinExpiry">
      <CoinExpiryUrgencyBannerBase />
    </FeatureFlagGate>
  );
}

export default CoinExpiryUrgencyBanner;