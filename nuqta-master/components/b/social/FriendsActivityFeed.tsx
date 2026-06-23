/**
 * FriendsActivityFeed — vertical list of friend activity only.
 *
 * Behaviour
 * ---------
 *   - Filters incoming events to `isFriend === true`. Non-friend events
 *     are dropped at this layer so consumers can pass the raw feed and
 *     trust the visual contract.
 *   - Renders a row of filter chips ("All friends", "Orders", "Savings").
 *     Tap a chip to scope the list. The "Savings" chip aggregates
 *     `cashback_earned`, `offer_redeemed`, and `deal_claimed`.
 *   - Empty state: "No friend activity yet".
 *
 * Feature flag
 * ------------
 *   - Wrapped in `<FeatureFlagGate flag="b.liveActivity">` so the whole
 *     list disappears when the B feature is disabled.
 *
 * Accessibility
 * -------------
 *   - Container has `accessibilityRole="list"`.
 *   - Each row has `accessibilityRole="button"` and a descriptive label.
 *   - Filter chips expose their selected state via
 *     `accessibilityState.selected`.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import logger from '@/utils/logger';
import type {
  ActivityFilter,
  FriendsActivityFeedProps,
  LiveActivityEvent,
  LiveActivityType,
} from '@/types/activity.types';

interface ChipDescriptor {
  key: ActivityFilter;
  label: string;
  /** If set, only these event types are included under the chip. */
  types?: ReadonlyArray<LiveActivityType>;
}

const CHIPS: ReadonlyArray<ChipDescriptor> = [
  { key: 'friends', label: 'All friends' },
  { key: 'orders', label: 'Orders', types: ['order_placed'] },
  {
    key: 'cashback',
    label: 'Savings',
    types: ['cashback_earned', 'offer_redeemed', 'deal_claimed'],
  },
];

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const delta = Date.now() - t;
  if (delta < 60_000) return 'just now';
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initialsFor(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

interface RowProps {
  event: LiveActivityEvent;
  onPress: (event: LiveActivityEvent) => void;
}

function FriendRow({ event, onPress }: RowProps): React.ReactElement {
  const handlePress = useCallback(() => onPress(event), [event, onPress]);

  const amountLabel =
    typeof event.amountPaise === 'number' && event.amountPaise > 0
      ? formatPrice(event.amountPaise / 100, 'INR', false)
      : null;

  const a11yLabel = [
    `${event.userName}`,
    event.action,
    amountLabel ?? null,
    event.storeName ?? null,
    timeAgo(event.timestamp),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowAvatar} accessibilityElementsHidden importantForAccessibility="no">
        <Text style={styles.rowAvatarText}>{initialsFor(event.userName)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowAction} numberOfLines={2}>
          <Text style={styles.rowUser}>{event.userName}</Text>
          {' '}
          {event.action}
        </Text>
        <View style={styles.rowMetaRow}>
          {event.storeName ? (
            <Text style={styles.rowStore}>{event.storeName}</Text>
          ) : null}
          <Text style={styles.rowTime}>{timeAgo(event.timestamp)}</Text>
        </View>
      </View>
      {amountLabel ? (
        <Text style={styles.rowAmount}>{amountLabel}</Text>
      ) : null}
    </Pressable>
  );
}

interface BaseProps extends FriendsActivityFeedProps {
  /** When the B feature flag is disabled, this component renders nothing. */
  isVisible: boolean;
}

function FriendsActivityFeedBase({
  events,
  onEventPress,
  isVisible,
}: BaseProps): React.ReactElement {
  const [filter, setFilter] = useState<ActivityFilter>('friends');

  const friendEvents = useMemo<LiveActivityEvent[]>(
    () => events.filter((e) => e.isFriend),
    [events],
  );

  const filtered = useMemo<LiveActivityEvent[]>(() => {
    const descriptor = CHIPS.find((c) => c.key === filter);
    if (!descriptor || !descriptor.types) return friendEvents;
    return friendEvents.filter((e) => descriptor.types!.includes(e.type));
  }, [filter, friendEvents]);

  const handlePress = useCallback(
    (event: LiveActivityEvent) => {
      if (!onEventPress) return;
      try {
        onEventPress(event);
      } catch (err) {
        logger.warn(
          'friends_activity_press_handler_threw',
          { error: String(err), eventId: event.id },
          'B Features',
        );
      }
    },
    [onEventPress],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<LiveActivityEvent>) => (
      <FriendRow event={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  const keyExtractor = useCallback((item: LiveActivityEvent) => item.id, []);

  if (!isVisible) return <></>;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Friends</Text>
      <View
        style={styles.chipsRow}
        accessibilityRole="tablist"
        accessibilityLabel="Friends activity filter"
      >
        {CHIPS.map((chip) => {
          const selected = chip.key === filter;
          return (
            <Pressable
              key={chip.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${chip.label}${selected ? ', selected' : ''}`}
              onPress={() => setFilter(chip.key)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  selected && styles.chipLabelSelected,
                ]}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No friend activity yet</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          scrollEnabled={false}
          accessibilityRole="list"
          accessibilityLabel={`Friends activity, ${filtered.length} item${
            filtered.length === 1 ? '' : 's'
          }`}
          ItemSeparatorComponent={Separator}
        />
      )}
    </View>
  );
}

function Separator(): React.ReactElement {
  return <View style={styles.separator} />;
}

/**
 * Public, feature-flag-gated wrapper.
 */
function FriendsActivityFeed({
  events,
  onEventPress,
}: FriendsActivityFeedProps): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.liveActivity">
      <FriendsActivityFeedBase
        events={events}
        onEventPress={onEventPress}
        isVisible={true}
      />
    </FeatureFlagGate>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.secondary,
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  chipLabelSelected: {
    color: colors.nileBlue,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightPeach,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowAvatarText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  rowBody: {
    flex: 1,
  },
  rowAction: {
    ...typography.body,
    color: colors.text.primary,
  },
  rowUser: {
    fontWeight: '700',
    color: colors.nileBlue,
  },
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  rowStore: {
    ...typography.caption,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  rowTime: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  rowAmount: {
    ...typography.label,
    color: colors.success,
    fontWeight: '800',
    marginLeft: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
  },
  emptyState: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
});

export default FriendsActivityFeed;