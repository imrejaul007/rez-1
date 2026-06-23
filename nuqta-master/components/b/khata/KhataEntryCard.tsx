/**
 * KhataEntryCard — single row of the khata ledger.
 *
 * Renders one merchant's outstanding balance plus a small "X transactions"
 * badge and the most-recent activity date. Tapping the card is delegated
 * to the caller via `onPress`; when no `onPress` is supplied the card
 * renders as a plain (non-pressable) view.
 *
 * Colour rules
 * ------------
 *  - `balancePaise < 0`  → red, "You owe ₹X" (with a leading minus sign).
 *  - `balancePaise > 0`  → green, "Owed to you ₹X".
 *  - `balancePaise === 0`→ neutral, "Settled" (should be rare — the API
 *    filters these out, but we defend against it anyway).
 *
 * Accessibility
 * -------------
 *  - `accessibilityLabel` reads: "Merchant, balance X rupees, Y transactions,
 *    last activity on <date>".
 *  - When `onPress` is set, the role is "button".
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import type { KhataEntry } from '@/hooks/b/khata/useKhata';

export interface KhataEntryCardProps {
  entry: KhataEntry;
  onPress?: () => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Human-friendly "x days ago" / "x weeks ago" / absolute date. */
function buildLastActivityLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return d.toLocaleDateString('en-IN');
  const days = Math.floor(diffMs / MS_PER_DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function categoryEmoji(category: string): string {
  const key = category.trim().toLowerCase();
  switch (key) {
    case 'grocery':
      return '🛒';
    case 'cafe':
      return '☕';
    case 'restaurant':
      return '🍕';
    case 'fashion':
      return '🛍️';
    case 'pharmacy':
      return '💊';
    default:
      return '🏪';
  }
}

function KhataEntryCardBase({ entry, onPress }: KhataEntryCardProps) {
  const balanceRupees = entry.balancePaise / 100;
  const isOwed = entry.balancePaise < 0;
  const isReceivable = entry.balancePaise > 0;

  const formatted = useMemo(() => {
    const result = formatPrice(Math.abs(balanceRupees), 'INR', false);
    return result ?? '₹0';
  }, [balanceRupees]);

  const balanceLabel = isReceivable
    ? `Owed to you ${formatted}`
    : isOwed
      ? `You owe ${formatted}`
      : `Settled ${formatted}`;

  const balanceColor = isReceivable
    ? colors.success
    : isOwed
      ? colors.error
      : colors.text.secondary;

  const lastActivity = useMemo(
    () => buildLastActivityLabel(entry.lastTransactionAt),
    [entry.lastTransactionAt],
  );

  const transactionsLabel =
    entry.transactionCount === 1
      ? '1 transaction'
      : `${entry.transactionCount} transactions`;

  const emoji = useMemo(() => categoryEmoji(entry.category), [entry.category]);

  const a11yLabel = `${entry.merchantName}, ${balanceLabel}, ${transactionsLabel}, last activity ${lastActivity || 'unknown'}.`;

  const inner = (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text
          style={styles.icon}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {emoji}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.merchantName} numberOfLines={1}>
          {entry.merchantName}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{transactionsLabel}</Text>
          </View>
          {lastActivity ? (
            <Text style={styles.lastActivity} numberOfLines={1}>
              Last: {lastActivity}
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={[styles.balance, { color: balanceColor }]} numberOfLines={1}>
        {isReceivable ? '+' : isOwed ? '-' : ''}{formatted}
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View accessibilityLabel={a11yLabel} style={styles.pressableWrap}>
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.pressableWrap, pressed && styles.pressed]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableWrap: {
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  icon: {
    fontSize: 20,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  merchantName: {
    ...typography.label,
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginRight: spacing.sm,
  },
  badgeText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  lastActivity: {
    ...typography.caption,
    color: colors.text.secondary,
    flexShrink: 1,
  },
  balance: {
    ...typography.h4,
    marginLeft: spacing.sm,
  },
});

const KhataEntryCard = React.memo(KhataEntryCardBase);
export default KhataEntryCard;
