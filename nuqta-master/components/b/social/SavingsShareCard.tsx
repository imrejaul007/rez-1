/**
 * SavingsShareCard — capture-friendly share image for the Weekly Digest.
 *
 * Renders a self-contained square card framed as a social-share image.
 * The parent wires the View ref (exposed via `forwardRef`) into a screen
 * capture library (e.g. `react-native-view-shot`) to snapshot the
 * rendered tree, then hands the URI to `expo-sharing` or the system
 * share sheet.
 *
 * Sizing
 * ------
 *   We don't hard-code 1080px because RN measures in dp — we use an
 *   `aspectRatio: 1` square with a fixed 320dp width by default so it
 *   renders identically on every device. The host capture library is
 *   responsible for upscaling to the target output size.
 *
 * Data
 * ----
 *   Takes a single `digest` prop matching `WeeklyDigestSummary` (see
 *   `types/social.types.ts`). The card never pulls from any store — the
 *   parent decides what to render.
 *
 * Gating
 * ------
 *   Intended to be wrapped in `<FeatureFlagGate flag="b.savingsShare">`
 *   by the caller.
 */
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import type { WeeklyDigestSummary } from '@/types/social.types';

/**
 * Imperative handle returned by the `ref` prop. Callers use
 * `handle.captureRef.current` as the source view for a view-shot
 * capture call.
 */
export interface SavingsShareCardHandle {
  /** The underlying host View — used by view-shot libraries for capture. */
  captureRef: React.RefObject<View>;
}

export interface SavingsShareCardProps {
  /** Digest summary to render. */
  digest: WeeklyDigestSummary;
  /** Called once the parent has captured a PNG of the card. */
  onCapture?: (uri: string) => void;
  /** Optional override of the trailing brand line. */
  brandLine?: string;
}

const RUPEE_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const DEFAULT_BRAND_LINE = 'REZ · rez.co.in';
const CARD_SIZE = 320;

function formatRupeesFromPaise(paise: number): string {
  return RUPEE_FORMATTER.format(paise / 100);
}

const SavingsShareCardBase = forwardRef<SavingsShareCardHandle, SavingsShareCardProps>(
  function SavingsShareCardImpl(
    { digest, onCapture: _onCapture, brandLine },
    forwardedRef,
  ): React.ReactElement {
    const localRef = useRef<View>(null);

    useImperativeHandle<SavingsShareCardHandle, SavingsShareCardHandle>(
      forwardedRef,
      () => ({ captureRef: localRef }),
      [],
    );

    const rupees = useMemo(
      () => formatRupeesFromPaise(digest.totalSavingsPaise),
      [digest.totalSavingsPaise],
    );
    const finalBrand = brandLine ?? DEFAULT_BRAND_LINE;
    const streakLabel = `${digest.streakDays}-day streak`;

    const a11yLabel = useMemo(() => {
      return (
        `Savings share card. I saved ${rupees} this week with REZ. ` +
        (digest.topStoreName ? `Top store ${digest.topStoreName}. ` : '') +
        (digest.topCategory ? `Top category ${digest.topCategory}. ` : '') +
        `${streakLabel}. ${finalBrand}.`
      );
    }, [rupees, digest.topStoreName, digest.topCategory, streakLabel, finalBrand]);

    return (
      <View
        ref={localRef}
        style={styles.card}
        accessible
        accessibilityLabel={a11yLabel}
        accessibilityRole="image"
      >
        <View style={styles.inner}>
          <Text style={styles.eyebrow}>YOUR WEEK IN REZ</Text>

          <View style={styles.brandRow}>
            <View style={styles.logoDot} />
            <Text style={styles.brandTag}>REZ</Text>
          </View>

          <Text style={styles.headline}>I saved</Text>
          <Text style={styles.bigNumber}>{rupees}</Text>
          <Text style={styles.subhead}>this week with REZ</Text>

          <View style={styles.pillRow}>
            {digest.topStoreName ? (
              <View
                style={styles.pill}
                accessible
                accessibilityLabel={`Top store ${digest.topStoreName}`}
              >
                <Text style={styles.pillEmoji} accessibilityElementsHidden importantForAccessibility="no">
                  🏪
                </Text>
                <Text style={styles.pillLabel}>Top store</Text>
                <Text style={styles.pillValue}>{digest.topStoreName}</Text>
              </View>
            ) : null}
            {digest.topCategory ? (
              <View
                style={styles.pill}
                accessible
                accessibilityLabel={`Top category ${digest.topCategory}`}
              >
                <Text style={styles.pillEmoji} accessibilityElementsHidden importantForAccessibility="no">
                  🏷️
                </Text>
                <Text style={styles.pillLabel}>Top category</Text>
                <Text style={styles.pillValue}>{digest.topCategory}</Text>
              </View>
            ) : null}
          </View>

          <View
            style={styles.streakBadge}
            accessible
            accessibilityLabel={streakLabel}
          >
            <Text style={styles.streakEmoji} accessibilityElementsHidden importantForAccessibility="no">
              🔥
            </Text>
            <Text style={styles.streakText}>{streakLabel}</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>{finalBrand}</Text>
          </View>
        </View>
      </View>
    );
  },
);

SavingsShareCardBase.displayName = 'SavingsShareCard';

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    alignSelf: 'center',
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.gold,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...typography.overline,
    color: colors.nileBlue,
    letterSpacing: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  logoDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.nileBlue,
    marginRight: spacing.xs,
  },
  brandTag: {
    ...typography.h4,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  headline: {
    ...typography.h3,
    color: colors.nileBlue,
    marginTop: spacing.base,
  },
  bigNumber: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: -1,
  },
  subhead: {
    ...typography.bodyLarge,
    color: colors.nileBlue,
    marginTop: -spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.base,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.nileBlue,
  },
  pillEmoji: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  pillLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  pillValue: {
    ...typography.labelSmall,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  streakBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: colors.nileBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  streakEmoji: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  streakText: {
    ...typography.labelSmall,
    color: colors.gold,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.nileBlue,
    marginRight: spacing.xs,
  },
  footerText: {
    ...typography.caption,
    color: colors.nileBlue,
    letterSpacing: 0.6,
  },
});

export default SavingsShareCardBase;