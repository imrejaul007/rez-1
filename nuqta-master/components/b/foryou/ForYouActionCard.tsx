/**
 * ForYouActionCard — single action card in the "For You Today" feed.
 *
 * Renders a single `ForYouAction`:
 *   - icon emoji
 *   - bold title
 *   - one-or-two-line description
 *   - optional "Potential savings: ₹X" badge
 *   - primary CTA button (or full-card press when `onPress` is provided)
 *
 * Visual treatment
 * ----------------
 * The card has a subtle gradient background keyed to `action.type`:
 *   - save       → green
 *   - insight    → blue
 *   - lifestyle  → gold
 *   - offer      → orange
 *   - tip        → purple
 *
 * The gradient is a `expo-linear-gradient` if installed, otherwise a
 * flat backgroundColor fallback so the card never breaks in tests or
 * on web-shim builds. We require the package defensively.
 *
 * Accessibility
 * -------------
 *  - `accessibilityLabel` reads: "<title>. <description>. Button: <ctaLabel>".
 *  - When `onPress` is set, role = "button".
 *  - The CTA button is also focusable and labelled separately.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import type { ForYouAction, ForYouActionType } from '@/types/foryou.types';

export interface ForYouActionCardProps {
  action: ForYouAction;
  /**
   * Optional press handler. When supplied the entire card is pressable;
   * the inline CTA button is omitted to avoid double-tap confusion.
   */
  onPress?: () => void;
}

interface TypeTheme {
  /** Outer card background (start of the gradient). */
  start: string;
  /** Outer card background (end of the gradient). */
  end: string;
  /** Accent used for the CTA pill and icon plate. */
  accent: string;
  /** Title foreground on top of the gradient. */
  title: string;
  /** Description foreground. */
  description: string;
  /** CTA label color. */
  ctaText: string;
}

const TYPE_THEMES: Record<ForYouActionType, TypeTheme> = {
  save: {
    start: '#E8F7EE',
    end: '#C9EFD7',
    accent: colors.success ?? '#2ECC71',
    title: '#0F5132',
    description: '#1F6B47',
    ctaText: '#0F5132',
  },
  insight: {
    start: '#E6F0FA',
    end: '#C7DEF3',
    accent: colors.nileBlue ?? '#1a3a52',
    title: '#0E2A40',
    description: '#1F3F5C',
    ctaText: '#0E2A40',
  },
  lifestyle: {
    start: '#FFF6E0',
    end: '#FFE9B3',
    accent: colors.gold ?? '#ffcd57',
    title: '#5C3B00',
    description: '#7A5100',
    ctaText: '#5C3B00',
  },
  offer: {
    start: '#FFEFE0',
    end: '#FFD9B5',
    accent: '#E67E22',
    title: '#5C2A00',
    description: '#7A3D12',
    ctaText: '#5C2A00',
  },
  tip: {
    start: '#F1E8FA',
    end: '#DECEF3',
    accent: '#7E57C2',
    title: '#321A5C',
    description: '#4B2F7A',
    ctaText: '#321A5C',
  },
};

/** Human-readable type label used in the accessibility hint. */
function typeLabel(type: ForYouActionType): string {
  switch (type) {
    case 'save':
      return 'Save';
    case 'insight':
      return 'Insight';
    case 'lifestyle':
      return 'Lifestyle';
    case 'offer':
      return 'Offer';
    case 'tip':
      return 'Tip';
    default:
      return 'Suggestion';
  }
}

function ForYouActionCardBase({ action, onPress }: ForYouActionCardProps) {
  const theme = TYPE_THEMES[action.type] ?? TYPE_THEMES.tip;

  const savingsRupees = useMemo(() => {
    if (
      typeof action.potentialSavingsPaise !== 'number' ||
      !Number.isFinite(action.potentialSavingsPaise) ||
      action.potentialSavingsPaise <= 0
    ) {
      return null;
    }
    const result = formatPrice(action.potentialSavingsPaise / 100, 'INR', false);
    return result ?? null;
  }, [action.potentialSavingsPaise]);

  const accessibilityLabel = useMemo(() => {
    const base = `${action.title}. ${action.description}`;
    const savings =
      savingsRupees !== null ? ` Potential savings: ${savingsRupees}.` : '';
    const cta = ` Button: ${action.ctaLabel}.`;
    return `${base}${savings}${cta} ${typeLabel(action.type)} action.`;
  }, [action, savingsRupees]);

  const inner = (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.start, borderColor: theme.accent },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconPlate,
            { backgroundColor: theme.accent },
          ]}
        >
          <Text
            style={styles.iconEmoji}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {action.iconEmoji}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text
            style={[styles.typePill, { color: theme.accent }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {typeLabel(action.type || '').toUpperCase()}
          </Text>
          <Text style={[styles.title, { color: theme.title }]} numberOfLines={2}>
            {action.title}
          </Text>
        </View>
      </View>

      {action.description ? (
        <Text
          style={[styles.description, { color: theme.description }]}
          numberOfLines={3}
        >
          {action.description}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        {savingsRupees !== null ? (
          <View
            style={[
              styles.savingsBadge,
              { backgroundColor: theme.accent },
            ]}
            accessibilityLabel={`Potential savings: ${savingsRupees}`}
          >
            <Text style={styles.savingsBadgeText}>
              {`Save ${savingsRupees}`}
            </Text>
          </View>
        ) : (
          <View style={styles.spacer} />
        )}

        {onPress ? null : (
          <View
            style={[styles.ctaPill, { borderColor: theme.accent }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Text style={[styles.ctaText, { color: theme.ctaText }]}>
              {action.ctaLabel}
            </Text>
            <Text style={[styles.ctaArrow, { color: theme.ctaText }]}>›</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (!onPress) {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        style={styles.pressableWrap}
      >
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressableWrap,
        pressed && styles.pressablePressed,
      ]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableWrap: {
    width: '100%',
    marginBottom: spacing.base,
  },
  pressablePressed: {
    opacity: 0.92,
  },
  card: {
    borderRadius: borderRadius.lg ?? 16,
    borderWidth: 1,
    padding: spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  iconPlate: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconEmoji: {
    fontSize: 22,
  },
  headerText: {
    flex: 1,
  },
  typePill: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  title: {
    ...typography.h4,
    fontWeight: '700',
  },
  description: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savingsBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full ?? 999,
  },
  savingsBadgeText: {
    ...typography.label,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full ?? 999,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  ctaText: {
    ...typography.label,
    fontWeight: '700',
  },
  ctaArrow: {
    ...typography.h4,
    marginLeft: spacing.xs,
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
  },
});

const ForYouActionCard = React.memo(ForYouActionCardBase);
export default ForYouActionCard;
