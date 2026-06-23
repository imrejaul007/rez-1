/**
 * SavingsHistoryItem — single row in the activity / history list.
 *
 * Layout: source emoji · description (medium weight) · store name (small,
 * secondary) · amount (+₹X in success green) · relative date.
 *
 * Source → emoji map (kept here so the icon column is deterministic):
 *   - cashback         → 💰
 *   - offer            → 🎁
 *   - loyalty          → ⭐
 *   - referral         → 👥
 *   - wallet_transfer  → ↔️
 *   - milestone_bonus  → 🏆
 *   - default          → 🪙
 *
 * Date helper supports: "Today", "Yesterday", "X days ago" (within 7d),
 * "X weeks ago" (within 6w), otherwise a short calendar date.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import type { SavingsHistoryItem } from '@/types/savings.types';

export interface SavingsHistoryItemRowProps {
  item: SavingsHistoryItem;
  onPress?: () => void;
}

const SOURCE_EMOJI: Record<string, string> = {
  cashback: '💰',
  offer: '🎁',
  loyalty: '⭐',
  referral: '👥',
  wallet_transfer: '↔️',
  milestone_bonus: '🏆',
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  // Strip the time so the difference is whole days.
  const startOfDay = (dt: Date): number =>
    new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / MS_PER_DAY);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 42) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  // Older — show a short calendar date.
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function SavingsHistoryItemBase({ item, onPress }: SavingsHistoryItemRowProps) {
  const emoji = useMemo(
    () => SOURCE_EMOJI[item.source] ?? '🪙',
    [item.source],
  );
  const dateText = useMemo(() => formatRelativeDate(item.date), [item.date]);
  const amountText = useMemo(() => {
    const rupees = (item.amountPaise ?? 0) / 100;
    const formatted = formatPrice(rupees, 'INR', false);
    return `+${formatted ?? '₹0'}`;
  }, [item.amountPaise]);

  const accessibilityLabel = `${item.description ?? 'Savings entry'} at ${item.storeName ?? 'store'}, ${amountText}, ${dateText}`;

  const inner = (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
          {emoji}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.description} numberOfLines={1}>
          {item.description}
        </Text>
        {item.storeName ? (
          <Text style={styles.store} numberOfLines={1}>
            {item.storeName}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{amountText}</Text>
        {dateText ? <Text style={styles.date}>{dateText}</Text> : null}
      </View>
    </View>
  );

  if (!onPress) {
    return (
      <View accessibilityLabel={accessibilityLabel} style={styles.pressable}>
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  pressablePressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: 18,
  },
  body: {
    flex: 1,
    marginRight: spacing.sm,
  },
  description: {
    ...typography.label,
    color: colors.text.primary,
  },
  store: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    ...typography.label,
    color: colors.success,
  },
  date: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});

const SavingsHistoryItem = React.memo(SavingsHistoryItemBase);
export default SavingsHistoryItem;