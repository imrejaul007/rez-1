/**
 * NearUVerticalTabs — horizontal tab strip for the Near-U page.
 *
 * Renders five equally-spaced tabs (All, Food, Express, Budget, Student
 * Offers). The active tab is highlighted with a `colors.gold` underline
 * and bolded label so users can tell at a glance which feed is shown.
 *
 * Behaviour
 * ---------
 *   - Stateless: parent owns the active vertical via the `active` prop
 *     and reacts to taps via `onChange`.
 *   - Each tab is a `<Pressable>` with `accessibilityRole="tab"`,
 *     `accessibilityState={{ selected }}`, and an `accessibilityLabel`
 *     so screen readers announce the vertical name + selected state.
 *   - The root view has `accessibilityRole="tablist"` to expose the
 *     group semantic to assistive tech.
 *
 * Visual design
 * -------------
 *   - Inactive label: `colors.text.secondary`.
 *   - Active label: `colors.nileBlue` with a 3px `colors.gold` underline.
 *   - Tab width is fixed at 88px so the strip has a stable rhythm on
 *     phone widths; content is truncated to one line on overflow.
 */
import React from 'react';
import {
  AccessibilityRole,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import type { NearUVertical } from '@/hooks/b/nearU/useNearUStores';

export interface NearUVerticalTabsProps {
  active: NearUVertical;
  onChange: (vertical: NearUVertical) => void;
}

interface TabDef {
  id: NearUVertical;
  label: string;
}

const TABS: ReadonlyArray<TabDef> = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'express', label: 'Express' },
  { id: 'budget', label: 'Budget' },
  { id: 'student-offers', label: 'Student Offers' },
];

function NearUVerticalTabsBase({
  active,
  onChange,
}: NearUVerticalTabsProps): React.ReactElement {
  return (
    <View
      style={styles.container}
      accessibilityRole={'tablist' as AccessibilityRole}
      accessibilityLabel="Near-U categories"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole={'tab' as AccessibilityRole}
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                if (tab.id !== active) onChange(tab.id);
              }}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.tabPressed,
              ]}
            >
              <Text
                style={[styles.label, isActive && styles.labelActive]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              <View
                style={[
                  styles.underline,
                  isActive ? styles.underlineActive : styles.underlineInactive,
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    minWidth: 88,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  tabPressed: {
    opacity: 0.7,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  labelActive: {
    color: colors.nileBlue,
    fontWeight: '700',
  },
  underline: {
    height: 3,
    width: '70%',
    borderRadius: borderRadius.full,
  },
  underlineActive: {
    backgroundColor: colors.gold,
  },
  underlineInactive: {
    backgroundColor: 'transparent',
  },
});

const NearUVerticalTabs = React.memo(NearUVerticalTabsBase);
export default NearUVerticalTabs;
