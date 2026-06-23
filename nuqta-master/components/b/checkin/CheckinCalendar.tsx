/**
 * CheckinCalendar — 7-day strip showing each day's check-in state.
 *
 * Each cell in the strip carries:
 *   - the day-of-month number,
 *   - a small weekday label ("Mon"),
 *   - an emoji badge (✅ claimed, ⭕ missed, ⚪ today/pending).
 *
 * Today is highlighted with a gold border. Each cell is its own
 * accessible element with a descriptive `accessibilityLabel` so screen
 * readers announce "Tuesday 17, claimed, 10 coins" etc.
 *
 * Props
 * -----
 *   - `weekData` — exactly seven `CheckinDay` entries, oldest first.
 *
 * Behaviour
 * ---------
 *   - Pure / stateless: parent owns the data; this component only renders.
 *   - Defensive against short / long arrays: pads to 7 cells with
 *     `future` placeholders so a backend hiccup can't visually break
 *     the strip.
 *   - Exposes a `CheckinDay` import so callers don't need a second
 *     path alias.
 *
 * Accessibility
 * -------------
 *   - Outer `View` exposes `accessibilityRole="list"` and a label.
 *   - Each cell is `accessible` with a composed label including the
 *     weekday, day-of-month, state, and (when relevant) coins earned.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import type { CheckinDay, CheckinDayState } from '@/hooks/b/checkin/useDailyCheckin';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUIRED_LENGTH = 7;

const EMOJI_BY_STATE: Record<CheckinDayState, string> = {
  claimed: '✅',
  missed: '⭕',
  pending: '⚪',
  future: '⚪',
};

const STATE_COPY: Record<CheckinDayState, string> = {
  claimed: 'claimed',
  missed: 'missed',
  pending: 'pending',
  future: 'upcoming',
};

const FUTURE_PLACEHOLDER_WEEKDAYS: ReadonlyArray<string> = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function padWeekData(input: ReadonlyArray<CheckinDay>): CheckinDay[] {
  const padded: CheckinDay[] = [];
  for (let i = 0; i < REQUIRED_LENGTH; i += 1) {
    const existing = input[i];
    if (existing !== undefined) {
      padded.push(existing);
    } else {
      padded.push({
        date: '',
        weekday: FUTURE_PLACEHOLDER_WEEKDAYS[i] ?? '',
        dayOfMonth: 0,
        state: 'future',
        coinsEarned: 0,
      });
    }
  }
  return padded;
}

function buildAccessibilityLabel(day: CheckinDay): string {
  const weekday = day.weekday.length > 0 ? day.weekday : 'Unknown';
  const dayOfMonth = day.dayOfMonth > 0 ? String(day.dayOfMonth) : 'unknown date';
  const state = STATE_COPY[day.state];
  if (day.state === 'claimed' && day.coinsEarned > 0) {
    return `${weekday} ${dayOfMonth}, claimed, ${day.coinsEarned} coins`;
  }
  return `${weekday} ${dayOfMonth}, ${state}`;
}

// ---------------------------------------------------------------------------
// Sub-component: a single day cell.
// ---------------------------------------------------------------------------

interface DayCellProps {
  day: CheckinDay;
  isToday: boolean;
}

function DayCellBase({ day, isToday }: DayCellProps): React.ReactElement {
  const emoji = EMOJI_BY_STATE[day.state];
  const label = useMemo(() => buildAccessibilityLabel(day), [day]);

  return (
    <View
      style={[
        styles.cell,
        isToday && styles.cellToday,
        day.state === 'claimed' && styles.cellClaimed,
        day.state === 'missed' && styles.cellMissed,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.emoji,
          day.state === 'missed' && styles.emojiMuted,
        ]}
      >
        {emoji}
      </Text>
      <Text style={styles.weekday}>{day.weekday}</Text>
      <Text style={styles.dayNumber}>{day.dayOfMonth > 0 ? day.dayOfMonth : '–'}</Text>
      {day.coinsEarned > 0 ? (
        <Text style={styles.coins}>+{day.coinsEarned}</Text>
      ) : (
        <Text style={styles.coinsPlaceholder}> </Text>
      )}
    </View>
  );
}

const DayCell = React.memo(DayCellBase);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface CheckinCalendarProps {
  weekData: CheckinDay[];
}

/**
 * 7-day check-in strip. Renders a horizontal row of cells; today is
 * highlighted with a gold border so the eye finds it instantly.
 */
function CheckinCalendarBase({ weekData }: CheckinCalendarProps): React.ReactElement {
  const days = useMemo(() => padWeekData(weekData), [weekData]);

  // "Today" is the last entry when its state is `pending`. (The mock
  // backend always places today at index 6 with state `pending`.)
  const todayIndex = useMemo(() => {
    for (let i = days.length - 1; i >= 0; i -= 1) {
      const candidate = days[i];
      if (candidate !== undefined && candidate.state === 'pending') {
        return i;
      }
    }
    return days.length - 1;
  }, [days]);

  return (
    <View
      accessibilityRole="list"
      accessibilityLabel="7 day check-in calendar"
      style={styles.container}
    >
      <Text style={styles.heading}>Last 7 days</Text>
      <View style={styles.strip}>
        {days.map((day, idx) => (
          <DayCell
            key={`${day.date || 'placeholder'}-${idx}`}
            day={day}
            isToday={idx === todayIndex}
          />
        ))}
      </View>
    </View>
  );
}

const CheckinCalendar = React.memo(CheckinCalendarBase);
export default CheckinCalendar;

// Re-export the day types so screen-level code can import them from the
// component module too.
export type { CheckinDay, CheckinDayState };

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  heading: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  cell: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cellToday: {
    borderColor: colors.gold,
    borderWidth: 2,
    backgroundColor: colors.background.accent,
  },
  cellClaimed: {
    backgroundColor: colors.background.accent,
  },
  cellMissed: {
    backgroundColor: colors.background.secondary,
    opacity: 0.85,
  },
  emoji: {
    fontSize: 18,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  emojiMuted: {
    opacity: 0.55,
  },
  weekday: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  dayNumber: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 2,
  },
  coins: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '700',
    fontSize: 11,
    marginTop: 2,
  },
  coinsPlaceholder: {
    fontSize: 11,
  },
});