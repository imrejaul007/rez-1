/**
 * WaysToBoostCard — list of concrete actions the user can take to bump
 * their REZ Score.
 *
 * Renders a vertical list of rows, each row:
 *   - Title (e.g. "Save ₹500 more this month")
 *   - "+X pts" badge (gold)
 *   - Tappable: fires `onActionPress(actionId)` (the page can route to
 *     the appropriate screen).
 *
 * Props
 * -----
 *   - `currentScore` — the user's current REZ Score (used as context in
 *                     log lines, not displayed here).
 *   - `onActionPress` — optional callback; receives a stable `actionId`
 *                       string (e.g. "save_more", "maintain_streak"). The
 *                       page is responsible for routing.
 *
 * Accessibility
 * -------------
 *   - Outer View exposes `accessibilityRole="list"`.
 *   - Each row is its own button-like element with a label that combines
 *     title + points reward.
 */
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import logger from '@/utils/logger';

/** Stable IDs for each boost action — emitted via `onActionPress`. */
export type BoostActionId =
  | 'save_more'
  | 'maintain_streak'
  | 'unlock_achievements'
  | 'complete_survey'
  | 'refer_friend'
  | 'subscribe_premium';

interface BoostRow {
  id: BoostActionId;
  title: string;
  points: number;
}

const BOOST_ROWS: ReadonlyArray<BoostRow> = [
  {
    id: 'save_more',
    title: 'Save ₹500 more this month',
    points: 50,
  },
  {
    id: 'maintain_streak',
    title: 'Maintain a 7-day streak',
    points: 30,
  },
  {
    id: 'unlock_achievements',
    title: 'Unlock 3 achievements',
    points: 25,
  },
  {
    id: 'complete_survey',
    title: 'Complete a survey',
    points: 10,
  },
  {
    id: 'refer_friend',
    title: 'Refer a friend',
    points: 100,
  },
  {
    id: 'subscribe_premium',
    title: 'Subscribe to REZ Premium',
    points: 200,
  },
];

export interface WaysToBoostCardProps {
  currentScore: number;
  onActionPress?: (actionId: string) => void;
}

function WaysToBoostCardBase({
  currentScore,
  onActionPress,
}: WaysToBoostCardProps) {
  const handlePress = useCallback(
    (id: BoostActionId) => {
      if (!onActionPress) return;
      logger.debug(
        'WaysToBoostCard: action pressed',
        { id, currentScore },
        'Loyalty',
      );
      onActionPress(id);
    },
    [onActionPress, currentScore],
  );

  const totalPoints = useMemo(
    () => BOOST_ROWS.reduce((sum, row) => sum + row.points, 0),
    [],
  );

  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={`Ways to boost your score — up to ${totalPoints} points available`}
      style={styles.container}
    >
      {BOOST_ROWS.map((row) => {
        const accessibilityLabel = `${row.title}, ${row.points} points`;
        return (
          <Pressable
            key={row.id}
            onPress={() => handlePress(row.id)}
            disabled={!onActionPress}
            accessibilityRole={onActionPress ? 'button' : 'text'}
            accessibilityLabel={accessibilityLabel}
            style={({ pressed }) => [
              styles.row,
              pressed && onActionPress ? styles.rowPressed : null,
            ]}
          >
            <Text style={styles.title} numberOfLines={2}>
              {row.title}
            </Text>
            <View
              style={styles.badge}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              <Text style={styles.badgeText}>+{row.points} pts</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  rowPressed: {
    opacity: 0.7,
  },
  title: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
    paddingRight: spacing.sm,
  },
  badge: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});

const WaysToBoostCard = React.memo(WaysToBoostCardBase);
export default WaysToBoostCard;
