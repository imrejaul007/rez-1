/**
 * PropertyFilterBar — the filter strip at the top of the Habixo page.
 *
 * Props
 * -----
 *  - `filters`: the current filter state. Treated as read-only by this
 *    component — every interaction funnels through `onChange`.
 *  - `onChange`: invoked with a new filter set whenever the user toggles
 *    a chip, edits the city, or moves the price slider.
 *
 * Layout
 * ------
 *   1. City text input.
 *   2. Horizontal scroll of type chips (Apartment, House, Office, ...).
 *   3. Two-thumb price range slider for the inclusive min / max rent.
 *
 * Accessibility
 * -------------
 *   - City input has its own label / placeholder.
 *   - Each type chip is its own accessible element with a
 *     state-dependent label ("Filter by Apartment, on" vs. "off").
 *   - The slider exposes a combined `accessibilityLabel` reading
 *     "Price range: minimum ₹X, maximum ₹Y".
 */
import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import {
  HABIXO_PROPERTY_TYPES,
  type HabixoPropertyFilters,
  type HabixoPropertyType,
} from '@/types/habixo.types';

export interface PropertyFilterBarProps {
  filters: HabixoPropertyFilters;
  onChange: (filters: HabixoPropertyFilters) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Friendly labels for the type chips. Mirrors the PropertyCard badge set. */
const TYPE_LABELS: Record<HabixoPropertyType, string> = {
  apartment: 'Apartment',
  house: 'House',
  office: 'Office',
  meeting_room: 'Meeting Room',
  pg: 'PG',
  studio: 'Studio',
};

/**
 * Slider bounds in paise. Chosen to span a useful Indian rental range
 * (₹5k / month → ₹5L / month) without overwhelming the slider. The
 * UI formats the steps as rupees (`stepRupees`).
 */
const MIN_PAISE = 5000_00; // ₹5,000
const MAX_PAISE = 500_000_00; // ₹5,00,000
const STEP_PAISE = 5000_00; // ₹5,000

const ALL_TYPE_VALUE: 'all' = 'all';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampPaise(value: number): number {
  if (!Number.isFinite(value)) return MIN_PAISE;
  if (value < MIN_PAISE) return MIN_PAISE;
  if (value > MAX_PAISE) return MAX_PAISE;
  return Math.round(value / STEP_PAISE) * STEP_PAISE;
}

function safeIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function formatRupees(paise: number): string {
  const formatted = formatPrice(paise / 100, 'INR', false);
  return formatted ?? '—';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TypeChipProps {
  value: HabixoPropertyType | 'all';
  label: string;
  active: boolean;
  onPress: () => void;
}

function TypeChip({
  value,
  label,
  active,
  onPress,
}: TypeChipProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={
        active
          ? `Filter by ${label}, on`
          : `Filter by ${label}, off`
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}
    >
      <Text
        style={[styles.chipText, active && styles.chipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface PriceSliderProps {
  minRentPaise: number | null;
  maxRentPaise: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

/**
 * Lightweight, dependency-free two-thumb price range slider.
 *
 * The implementation is deliberately simple: two `Pressable` thumbs sit
 * on a track and stepping them moves the inclusive min / max. We avoid
 * a third-party slider library to keep the migration's dependency
 * budget flat (per the migration constraints).
 */
function PriceSlider({
  minRentPaise,
  maxRentPaise,
  onChange,
}: PriceSliderProps): React.ReactElement {
  const min = minRentPaise ?? MIN_PAISE;
  const max = maxRentPaise ?? MAX_PAISE;

  const accessibilityLabel = useMemo(
    () => `Price range: minimum ${formatRupees(min)}, maximum ${formatRupees(max)}`,
    [min, max],
  );

  const step = useCallback(
    (target: 'min' | 'max', direction: 1 | -1): void => {
      if (target === 'min') {
        const nextMin = clampPaise(min + direction * STEP_PAISE);
        // Don't let the min slider cross over the max.
        const clamped = Math.min(nextMin, max);
        onChange(clamped, maxRentPaise);
      } else {
        const nextMax = clampPaise(max + direction * STEP_PAISE);
        // Don't let the max slider cross over the min.
        const clamped = Math.max(nextMax, min);
        onChange(minRentPaise, clamped);
      }
    },
    [min, max, minRentPaise, maxRentPaise, onChange],
  );

  const minPct = ((min - MIN_PAISE) / (MAX_PAISE - MIN_PAISE)) * 100;
  const maxPct = ((max - MIN_PAISE) / (MAX_PAISE - MIN_PAISE)) * 100;

  return (
    <View style={styles.sliderWrap} accessibilityLabel={accessibilityLabel}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>Price</Text>
        <Text style={styles.sliderValue}>
          {`₹${formatRupees(min)} – ₹${formatRupees(max)}`}
        </Text>
      </View>
      <View style={styles.sliderTrack} accessibilityElementsHidden importantForAccessibility="no">
        <View
          style={[
            styles.sliderRange,
            { left: `${minPct}%`, right: `${100 - maxPct}%` },
          ]}
        />
      </View>
      <View style={styles.sliderButtonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease minimum price, currently ${formatRupees(min)}`}
          onPress={() => step('min', -1)}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.chipPressed]}
        >
          <Text style={styles.stepBtnText}>‹ Min</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase minimum price, currently ${formatRupees(min)}`}
          onPress={() => step('min', 1)}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.chipPressed]}
        >
          <Text style={styles.stepBtnText}>Min ›</Text>
        </Pressable>
        <View style={styles.sliderSpacer} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease maximum price, currently ${formatRupees(max)}`}
          onPress={() => step('max', -1)}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.chipPressed]}
        >
          <Text style={styles.stepBtnText}>‹ Max</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase maximum price, currently ${formatRupees(max)}`}
          onPress={() => step('max', 1)}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.chipPressed]}
        >
          <Text style={styles.stepBtnText}>Max ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function PropertyFilterBarBase({
  filters,
  onChange,
}: PropertyFilterBarProps): React.ReactElement {
  const setCity = useCallback(
    (city: string): void => {
      onChange({ ...filters, city });
    },
    [filters, onChange],
  );

  const setType = useCallback(
    (type: HabixoPropertyType | null): void => {
      onChange({ ...filters, type });
    },
    [filters, onChange],
  );

  const setRange = useCallback(
    (min: number | null, max: number | null): void => {
      onChange({
        ...filters,
        minRentPaise: safeIntOrNull(min),
        maxRentPaise: safeIntOrNull(max),
      });
    },
    [filters, onChange],
  );

  return (
    <View
      style={styles.wrap}
      accessibilityLabel="Property filters"
    >
      <View style={styles.cityRow}>
        <TextInput
          style={styles.cityInput}
          placeholder="City (e.g. Bangalore)"
          placeholderTextColor={colors.text.tertiary}
          value={filters.city}
          onChangeText={setCity}
          autoCapitalize="words"
          autoCorrect={false}
          accessibilityLabel="Filter by city"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        accessibilityRole="tablist"
      >
        <TypeChip
          value={ALL_TYPE_VALUE}
          label="All"
          active={filters.type === null}
          onPress={() => setType(null)}
        />
        {HABIXO_PROPERTY_TYPES.map((type) => (
          <TypeChip
            key={type}
            value={type}
            label={TYPE_LABELS[type]}
            active={filters.type === type}
            onPress={() => setType(type)}
          />
        ))}
      </ScrollView>

      <PriceSlider
        minRentPaise={filters.minRentPaise}
        maxRentPaise={filters.maxRentPaise}
        onChange={setRange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  cityRow: {
    marginBottom: spacing.sm,
  },
  cityInput: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipRow: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.primary,
    marginRight: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.nileBlue,
    borderColor: colors.nileBlue,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sliderWrap: {
    marginTop: spacing.sm,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  sliderLabel: {
    ...typography.label,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sliderValue: {
    ...typography.body,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border.light,
    marginVertical: spacing.xs,
  },
  sliderRange: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.gold,
    borderRadius: 3,
  },
  sliderButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  sliderSpacer: {
    flex: 1,
  },
  stepBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.primary,
    marginRight: spacing.xs,
  },
  stepBtnText: {
    ...typography.caption,
    color: colors.nileBlue,
    fontWeight: '700',
  },
});

const PropertyFilterBar = React.memo(PropertyFilterBarBase);
export default PropertyFilterBar;
