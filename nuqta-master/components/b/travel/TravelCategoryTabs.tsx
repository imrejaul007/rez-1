/**
 * TravelCategoryTabs — five-way segmented control for the travel
 * search page.
 *
 * Renders one tab per supported `TravelCategory` — Flight, Hotel,
 * Train, Cab, Bus. The active tab is highlighted with
 * `colors.gold` and the rest are styled as muted/inactive.
 *
 * Accessibility
 * -------------
 *  - Root view has `accessibilityRole="tablist"`.
 *  - Each tab has `accessibilityRole="tab"` and
 *    `accessibilityState={{ selected: isActive }}`.
 *  - `accessibilityLabel` reads the category title verbatim.
 *
 * Usage
 * -----
 *  ```tsx
 *  <TravelCategoryTabs active={category} onChange={setCategory} />
 *  ```
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import {
  TRAVEL_CATEGORIES,
  TRAVEL_CATEGORY_LABELS,
  type TravelCategory,
} from '@/types/travel.types';

export interface TravelCategoryTabsProps {
  active: TravelCategory;
  onChange: (category: TravelCategory) => void;
}

function TravelCategoryTabsBase({ active, onChange }: TravelCategoryTabsProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        accessibilityRole="tablist"
      >
        {TRAVEL_CATEGORIES.map((category) => {
          const isActive = category === active;
          const label = TRAVEL_CATEGORY_LABELS[category];
          return (
            <Pressable
              key={category}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                if (isActive) return;
                onChange(category);
              }}
              style={({ pressed }) => [
                styles.tab,
                isActive && styles.tabActive,
                pressed && styles.tabPressed,
              ]}
            >
              <Text
                style={[styles.tabText, isActive && styles.tabTextActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.secondary,
    marginRight: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  tabPressed: {
    opacity: 0.8,
  },
  tabText: {
    ...typography.label,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.nileBlue,
  },
});

const TravelCategoryTabs = React.memo(TravelCategoryTabsBase);
export default TravelCategoryTabs;