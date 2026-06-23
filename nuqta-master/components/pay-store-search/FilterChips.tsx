import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

// New Color Palette
const PALETTE = {
  nileBlue: colors.nileBlue,
  lightMustard: colors.lightMustard,
  linen: colors.linen,
  lightPeach: colors.lightPeach,
  lavenderMist: colors.lavenderMist,
};

interface FilterChipsProps {
  filters: {
    nearMe: boolean;
    offersAvailable: boolean;
    cashback: boolean;
  };
  onFilterChange: (filter: 'nearMe' | 'offersAvailable' | 'cashback', value: boolean) => void;
}

interface ChipConfig {
  key: 'nearMe' | 'offersAvailable' | 'cashback';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CHIP_CONFIGS: ChipConfig[] = [
  { key: 'nearMe', label: 'Near Me', icon: 'location' },
  { key: 'offersAvailable', label: 'Offers Available', icon: 'pricetag' },
  { key: 'cashback', label: 'Cashback', icon: 'cash' },
];

const FilterChips: React.FC<FilterChipsProps> = ({ filters, onFilterChange }) => {
  const handlePress = (filterKey: 'nearMe' | 'offersAvailable' | 'cashback') => {
    onFilterChange(filterKey, !filters[filterKey]);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
    >
      {CHIP_CONFIGS.map((chip) => {
        const isActive = filters[chip.key];

        return (
          <Pressable
            key={chip.key}
            onPress={() => handlePress(chip.key)}
            style={({ pressed }) => [
              styles.chip,
              isActive ? styles.chipActive : styles.chipInactive,
              pressed && styles.chipPressed,
            ]}
          >
            <Ionicons
              name={chip.icon}
              size={16}
              color={isActive ? colors.background.primary : colors.neutral[500]}
              style={styles.icon}
            />
            <Text style={[
              styles.chipText,
              isActive ? styles.chipTextActive : styles.chipTextInactive,
            ]}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: PALETTE.nileBlue,
    borderWidth: 0,
  },
  chipInactive: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  chipPressed: {
    opacity: 0.7,
  },
  icon: {
    marginRight: 5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.background.primary,
  },
  chipTextInactive: {
    color: colors.neutral[500],
  },
});

export default React.memo(FilterChips);
